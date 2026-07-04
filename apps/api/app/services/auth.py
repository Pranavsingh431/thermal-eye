"""Token issuance & rotation."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.enums import Role
from app.core.security import (
    create_token,
    generate_opaque_token,
    hash_opaque_token,
)
from app.models.user import Membership, RefreshToken, User
from app.schemas.common import TokenResponse


async def resolve_active_membership(
    db: AsyncSession, user: User, org_id: str | None
) -> Membership | None:
    stmt = select(Membership).where(Membership.user_id == user.id)
    if org_id:
        try:
            stmt = stmt.where(Membership.org_id == uuid.UUID(str(org_id)))
        except ValueError:
            return None
    stmt = stmt.order_by(Membership.created_at.asc())
    return await db.scalar(stmt)


async def issue_token_pair(
    db: AsyncSession,
    user: User,
    *,
    org_id: uuid.UUID | None,
    role: Role | None,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> TokenResponse:
    access = create_token(
        str(user.id),
        "access",
        org_id=str(org_id) if org_id else None,
        role=role.value if role else None,
    )
    refresh_plain = generate_opaque_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_opaque_token(refresh_plain),
            expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.refresh_token_expire_days),
            user_agent=(user_agent or "")[:400] or None,
            ip_address=ip_address,
        )
    )
    # Encode org context into the refresh JWT wrapper so refresh keeps the same active org.
    refresh_jwt = create_token(
        str(user.id),
        "refresh",
        org_id=str(org_id) if org_id else None,
        role=role.value if role else None,
        extra={"rt": refresh_plain},
    )
    return TokenResponse(access_token=access, refresh_token=refresh_jwt)


async def rotate_refresh_token(
    db: AsyncSession, refresh_plain: str
) -> bool:
    """Mark a refresh token revoked; returns True if it was valid & active."""
    row = await db.scalar(
        select(RefreshToken).where(
            RefreshToken.token_hash == hash_opaque_token(refresh_plain)
        )
    )
    if row is None or row.revoked or row.expires_at < datetime.now(timezone.utc):
        return False
    row.revoked = True
    return True
