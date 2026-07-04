"""Authentication & account routes."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import func, select

from app.api.deps import CurrentContext, DbSession
from app.core.enums import Role
from app.core.security import (
    decode_token,
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
    verify_password,
)
from app.core.utils import unique_slug
from app.models.organization import Organization
from app.models.user import Membership, PasswordResetToken, User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    SwitchOrgRequest,
)
from app.schemas.common import Message, TokenResponse
from app.schemas.user import MeResponse, OrgSummary, UserOut
from app.services.audit import record_audit
from app.services.auth import (
    issue_token_pair,
    resolve_active_membership,
    rotate_refresh_token,
)
from app.services.email import send_email

router = APIRouter(prefix="/auth", tags=["auth"])


def _client(req: Request) -> tuple[str | None, str | None]:
    ip = req.client.host if req.client else None
    return ip, req.headers.get("user-agent")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, req: Request, db: DbSession) -> TokenResponse:
    email = payload.email.lower()
    exists = await db.scalar(select(func.count()).select_from(User).where(User.email == email))
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    user = User(
        email=email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        email_verified=False,
    )
    db.add(user)
    await db.flush()

    org = Organization(name=payload.organization_name, slug=unique_slug(payload.organization_name))
    db.add(org)
    await db.flush()

    db.add(Membership(user_id=user.id, org_id=org.id, role=Role.OWNER.value))
    await db.flush()

    ip, ua = _client(req)
    await record_audit(
        db, action="user.register", user_id=user.id, user_email=email, org_id=org.id,
        ip_address=ip, user_agent=ua,
    )
    tokens = await issue_token_pair(
        db, user, org_id=org.id, role=Role.OWNER, user_agent=ua, ip_address=ip
    )
    await db.commit()
    return tokens


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, req: Request, db: DbSession) -> TokenResponse:
    email = payload.email.lower()
    user = await db.scalar(select(User).where(User.email == email))
    # Constant-ish work whether or not the user exists, to blunt timing/enumeration.
    valid = bool(user) and verify_password(payload.password, user.hashed_password)
    if not user or not valid or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    membership = await resolve_active_membership(db, user, payload.org_id)
    org_id = membership.org_id if membership else None
    role = Role(membership.role) if membership else None

    user.last_login_at = datetime.now(timezone.utc)
    ip, ua = _client(req)
    await record_audit(
        db, action="user.login", user_id=user.id, user_email=email, org_id=org_id,
        ip_address=ip, user_agent=ua,
    )
    tokens = await issue_token_pair(db, user, org_id=org_id, role=role, user_agent=ua, ip_address=ip)
    await db.commit()
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, req: Request, db: DbSession) -> TokenResponse:
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh" or "rt" not in data:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    if not await rotate_refresh_token(db, data["rt"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token expired or revoked")

    user = await db.get(User, uuid.UUID(str(data["sub"])))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    # Re-verify the org membership still stands.
    org_id = None
    role = None
    if data.get("org"):
        membership = await db.scalar(
            select(Membership).where(
                Membership.user_id == user.id,
                Membership.org_id == uuid.UUID(str(data["org"])),
            )
        )
        if membership:
            org_id = membership.org_id
            role = Role(membership.role)

    ip, ua = _client(req)
    tokens = await issue_token_pair(db, user, org_id=org_id, role=role, user_agent=ua, ip_address=ip)
    await db.commit()
    return tokens


@router.post("/logout", response_model=Message)
async def logout(payload: RefreshRequest, db: DbSession) -> Message:
    data = decode_token(payload.refresh_token)
    if data and data.get("type") == "refresh" and "rt" in data:
        await rotate_refresh_token(db, data["rt"])
        await db.commit()
    return Message(message="Logged out")


@router.post("/switch-org", response_model=TokenResponse)
async def switch_org(
    payload: SwitchOrgRequest, req: Request, ctx: CurrentContext, db: DbSession
) -> TokenResponse:
    try:
        target = uuid.UUID(payload.org_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid org id") from None
    membership = await db.scalar(
        select(Membership).where(
            Membership.user_id == ctx.user.id, Membership.org_id == target
        )
    )
    if not membership:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not a member of that organization")
    ip, ua = _client(req)
    tokens = await issue_token_pair(
        db, ctx.user, org_id=membership.org_id, role=Role(membership.role),
        user_agent=ua, ip_address=ip,
    )
    await db.commit()
    return tokens


@router.get("/me", response_model=MeResponse)
async def me(ctx: CurrentContext, db: DbSession) -> MeResponse:
    rows = (
        await db.execute(
            select(Membership, Organization)
            .join(Organization, Organization.id == Membership.org_id)
            .where(Membership.user_id == ctx.user.id)
            .order_by(Membership.created_at.asc())
        )
    ).all()
    orgs = [
        OrgSummary(id=org.id, name=org.name, slug=org.slug, role=m.role) for m, org in rows
    ]
    return MeResponse(
        user=UserOut.model_validate(ctx.user),
        active_org_id=ctx.org_id,
        active_role=ctx.role.value if ctx.role else None,
        organizations=orgs,
    )


@router.post("/forgot-password", response_model=Message)
async def forgot_password(payload: ForgotPasswordRequest, db: DbSession) -> Message:
    email = payload.email.lower()
    user = await db.scalar(select(User).where(User.email == email))
    if user:
        token = generate_opaque_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_opaque_token(token),
                expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            )
        )
        await db.commit()
        await send_email(
            [email],
            "Reset your ThermalEye password",
            f"<p>Use this token to reset your password (valid 1 hour):</p><code>{token}</code>",
            text=f"Password reset token (valid 1 hour): {token}",
        )
    # Always the same response — never reveal whether an account exists.
    return Message(message="If that account exists, a reset link has been sent.")


@router.post("/reset-password", response_model=Message)
async def reset_password(payload: ResetPasswordRequest, db: DbSession) -> Message:
    row = await db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == hash_opaque_token(payload.token)
        )
    )
    if not row or row.used or row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset token")
    user = await db.get(User, row.user_id)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid reset token")
    user.hashed_password = hash_password(payload.password)
    row.used = True
    await record_audit(db, action="user.password_reset", user_id=user.id, user_email=user.email)
    await db.commit()
    return Message(message="Password updated. You can now sign in.")
