"""Organization schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import Role
from app.schemas.common import ORMModel


class OrgOut(ORMModel):
    id: uuid.UUID
    name: str
    slug: str
    logo_url: str | None
    primary_color: str
    accent_color: str
    industry: str | None
    plan: str
    settings: dict[str, Any]
    created_at: datetime


class OrgBrandingUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=200)
    logo_url: str | None = Field(default=None, max_length=500)
    primary_color: str | None = Field(default=None, max_length=9)
    accent_color: str | None = Field(default=None, max_length=9)
    industry: str | None = Field(default=None, max_length=80)


class ThresholdSettings(BaseModel):
    warning_delta: float = 15
    critical_delta: float = 30
    warning_abs: float = 60
    critical_abs: float = 80


class OrgSettingsUpdate(BaseModel):
    thresholds: ThresholdSettings | None = None
    units: str | None = None
    timezone: str | None = None
    alert_recipients: list[EmailStr] | None = None
    alerts_enabled: bool | None = None
    map: dict[str, Any] | None = None


class MemberInvite(BaseModel):
    email: EmailStr
    role: Role = Role.INSPECTOR
    full_name: str | None = None


class MemberRoleUpdate(BaseModel):
    role: Role
