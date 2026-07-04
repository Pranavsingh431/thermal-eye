"""Authentication, tenant-resolution, and RBAC dependencies.

Every authenticated request produces an ``AuthContext`` carrying the caller's
identity, their *active organization*, and their role in that org. Route handlers
must scope all queries by ``ctx.org_id`` — this is the primary tenant-isolation
guarantee (Postgres RLS is layered on top as defense-in-depth).
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.enums import Role
from app.core.security import decode_token
from app.models.user import Membership, User

_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


@dataclass
class AuthContext:
    user: User
    org_id: uuid.UUID | None
    role: Role | None
    membership_id: uuid.UUID | None


async def get_context(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: DbSession,
) -> AuthContext:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")

    payload = decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    try:
        user_id = uuid.UUID(str(payload["sub"]))
    except (KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token") from None

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")

    org_id: uuid.UUID | None = None
    role: Role | None = None
    membership_id: uuid.UUID | None = None

    raw_org = payload.get("org")
    if raw_org:
        try:
            candidate_org = uuid.UUID(str(raw_org))
        except ValueError:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Malformed token") from None
        # Re-verify membership every request so revoked/changed access takes effect immediately.
        membership = await db.scalar(
            select(Membership).where(
                Membership.user_id == user.id, Membership.org_id == candidate_org
            )
        )
        if membership is None:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN, "You are not a member of this organization"
            )
        org_id = membership.org_id
        role = Role(membership.role)
        membership_id = membership.id

    return AuthContext(user=user, org_id=org_id, role=role, membership_id=membership_id)


CurrentContext = Annotated[AuthContext, Depends(get_context)]


async def get_current_user(ctx: CurrentContext) -> User:
    return ctx.user


async def require_org(ctx: CurrentContext) -> AuthContext:
    """Ensure the caller has an active organization selected."""
    if ctx.org_id is None or ctx.role is None:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "No active organization. Select or create one first.",
        )
    return ctx


OrgContext = Annotated[AuthContext, Depends(require_org)]


def require_role(minimum: Role):
    """Dependency factory: require at least ``minimum`` role in the active org."""

    async def _dep(ctx: OrgContext) -> AuthContext:
        assert ctx.role is not None
        if ctx.role.rank < minimum.rank:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires '{minimum.value}' role or higher",
            )
        return ctx

    return _dep
