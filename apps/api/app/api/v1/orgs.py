"""Organization settings, branding, and membership management."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.api.deps import DbSession, OrgContext, require_role
from app.core.enums import Role
from app.core.security import generate_opaque_token, hash_opaque_token, hash_password
from app.models.organization import Organization
from app.models.user import Membership, PasswordResetToken, User
from app.schemas.common import Message
from app.schemas.org import (
    MemberInvite,
    MemberRoleUpdate,
    OrgBrandingUpdate,
    OrgOut,
    OrgSettingsUpdate,
)
from app.schemas.user import MemberOut
from app.services.audit import record_audit
from app.services.email import send_email

router = APIRouter(prefix="/orgs", tags=["organizations"])

AdminCtx = Annotated[object, Depends(require_role(Role.ADMIN))]
OwnerCtx = Annotated[object, Depends(require_role(Role.OWNER))]


async def _get_org(db: DbSession, org_id: uuid.UUID) -> Organization:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    return org


@router.get("/current", response_model=OrgOut)
async def get_current_org(ctx: OrgContext, db: DbSession) -> OrgOut:
    org = await _get_org(db, ctx.org_id)  # type: ignore[arg-type]
    return OrgOut.model_validate(org)


@router.patch("/current/branding", response_model=OrgOut)
async def update_branding(
    payload: OrgBrandingUpdate, ctx: AdminCtx, db: DbSession
) -> OrgOut:
    org = await _get_org(db, ctx.org_id)  # type: ignore[attr-defined]
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    await record_audit(
        db, action="org.branding_update", user_id=ctx.user.id, org_id=org.id,  # type: ignore[attr-defined]
        resource="organization",
    )
    await db.commit()
    await db.refresh(org)
    return OrgOut.model_validate(org)


@router.patch("/current/settings", response_model=OrgOut)
async def update_settings(
    payload: OrgSettingsUpdate, ctx: AdminCtx, db: DbSession
) -> OrgOut:
    org = await _get_org(db, ctx.org_id)  # type: ignore[attr-defined]
    updates = payload.model_dump(exclude_unset=True, mode="json")
    merged = dict(org.settings or {})
    for key, value in updates.items():
        if key == "thresholds" and isinstance(value, dict):
            merged["thresholds"] = {**merged.get("thresholds", {}), **value}
        else:
            merged[key] = value
    org.settings = merged  # reassign so SQLAlchemy tracks the JSON change
    await record_audit(
        db, action="org.settings_update", user_id=ctx.user.id, org_id=org.id,  # type: ignore[attr-defined]
        resource="organization", details={"keys": list(updates.keys())},
    )
    await db.commit()
    await db.refresh(org)
    return OrgOut.model_validate(org)


@router.get("/current/members", response_model=list[MemberOut])
async def list_members(ctx: OrgContext, db: DbSession) -> list[MemberOut]:
    rows = (
        await db.execute(
            select(Membership, User)
            .join(User, User.id == Membership.user_id)
            .where(Membership.org_id == ctx.org_id)
            .order_by(Membership.created_at.asc())
        )
    ).all()
    return [
        MemberOut(
            id=m.id, user_id=u.id, email=u.email, full_name=u.full_name,
            role=m.role, created_at=m.created_at,
        )
        for m, u in rows
    ]


@router.post("/current/members", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
async def invite_member(payload: MemberInvite, ctx: AdminCtx, db: DbSession) -> MemberOut:
    org_id = ctx.org_id  # type: ignore[attr-defined]
    email = payload.email.lower()
    if payload.role == Role.OWNER and ctx.role != Role.OWNER:  # type: ignore[attr-defined]
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an owner can grant owner role")

    user = await db.scalar(select(User).where(User.email == email))
    invited_link_token: str | None = None
    if user is None:
        # Create a shell account with a random password; they set it via reset link.
        user = User(
            email=email,
            full_name=payload.full_name,
            hashed_password=hash_password(generate_opaque_token()),
            email_verified=False,
        )
        db.add(user)
        await db.flush()
        invited_link_token = generate_opaque_token()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_opaque_token(invited_link_token),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )

    existing = await db.scalar(
        select(Membership).where(Membership.user_id == user.id, Membership.org_id == org_id)
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "User is already a member")

    membership = Membership(user_id=user.id, org_id=org_id, role=payload.role.value)
    db.add(membership)
    await record_audit(
        db, action="org.member_invite", user_id=ctx.user.id, org_id=org_id,  # type: ignore[attr-defined]
        resource="membership", details={"email": email, "role": payload.role.value},
    )
    await db.commit()
    await db.refresh(membership)

    org = await _get_org(db, org_id)
    if invited_link_token:
        await send_email(
            [email],
            f"You've been invited to {org.name} on ThermalEye",
            f"<p>You've been added to <b>{org.name}</b>. Set your password with this token "
            f"(valid 7 days):</p><code>{invited_link_token}</code>",
            text=f"Set your password with this token (valid 7 days): {invited_link_token}",
        )
    return MemberOut(
        id=membership.id, user_id=user.id, email=user.email, full_name=user.full_name,
        role=membership.role, created_at=membership.created_at,
    )


@router.patch("/current/members/{membership_id}", response_model=MemberOut)
async def update_member_role(
    membership_id: uuid.UUID, payload: MemberRoleUpdate, ctx: AdminCtx, db: DbSession
) -> MemberOut:
    org_id = ctx.org_id  # type: ignore[attr-defined]
    membership = await db.get(Membership, membership_id)
    if not membership or membership.org_id != org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    if payload.role == Role.OWNER and ctx.role != Role.OWNER:  # type: ignore[attr-defined]
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an owner can grant owner role")
    membership.role = payload.role.value
    await record_audit(
        db, action="org.member_role_update", user_id=ctx.user.id, org_id=org_id,  # type: ignore[attr-defined]
        resource="membership", details={"membership_id": str(membership_id), "role": payload.role.value},
    )
    await db.commit()
    user = await db.get(User, membership.user_id)
    return MemberOut(
        id=membership.id, user_id=user.id, email=user.email, full_name=user.full_name,
        role=membership.role, created_at=membership.created_at,
    )


@router.delete("/current/members/{membership_id}", response_model=Message)
async def remove_member(
    membership_id: uuid.UUID, ctx: AdminCtx, db: DbSession
) -> Message:
    org_id = ctx.org_id  # type: ignore[attr-defined]
    membership = await db.get(Membership, membership_id)
    if not membership or membership.org_id != org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    if membership.user_id == ctx.user.id:  # type: ignore[attr-defined]
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot remove yourself")
    # Don't allow removing the last owner.
    if membership.role == Role.OWNER.value:
        owners = (
            await db.execute(
                select(Membership).where(
                    Membership.org_id == org_id, Membership.role == Role.OWNER.value
                )
            )
        ).scalars().all()
        if len(owners) <= 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot remove the last owner")
    await db.delete(membership)
    await record_audit(
        db, action="org.member_remove", user_id=ctx.user.id, org_id=org_id,  # type: ignore[attr-defined]
        resource="membership", details={"membership_id": str(membership_id)},
    )
    await db.commit()
    return Message(message="Member removed")
