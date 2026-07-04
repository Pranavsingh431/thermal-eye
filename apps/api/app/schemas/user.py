"""User & membership schemas."""

from __future__ import annotations

import uuid
from datetime import datetime

from app.schemas.common import ORMModel


class UserOut(ORMModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    is_active: bool
    email_verified: bool
    last_login_at: datetime | None
    created_at: datetime


class OrgSummary(ORMModel):
    id: uuid.UUID
    name: str
    slug: str
    role: str  # the current user's role in this org


class MeResponse(ORMModel):
    user: UserOut
    active_org_id: uuid.UUID | None
    active_role: str | None
    organizations: list[OrgSummary]


class MemberOut(ORMModel):
    id: uuid.UUID  # membership id
    user_id: uuid.UUID
    email: str
    full_name: str | None
    role: str
    created_at: datetime
