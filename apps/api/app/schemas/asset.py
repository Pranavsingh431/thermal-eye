"""Asset schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.core.enums import AssetType
from app.schemas.common import ORMModel


class AssetBase(BaseModel):
    external_id: str | None = Field(default=None, max_length=120)
    name: str = Field(min_length=1, max_length=200)
    asset_type: AssetType = AssetType.TOWER
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    geometry: dict[str, Any] | None = None
    voltage_kv: float | None = None
    capacity_amps: float | None = None
    commissioning_year: int | None = Field(default=None, ge=1900, le=2100)
    region: str | None = Field(default=None, max_length=120)
    asset_metadata: dict[str, Any] = Field(default_factory=dict)


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    external_id: str | None = None
    name: str | None = None
    asset_type: AssetType | None = None
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    geometry: dict[str, Any] | None = None
    voltage_kv: float | None = None
    capacity_amps: float | None = None
    commissioning_year: int | None = None
    region: str | None = None
    asset_metadata: dict[str, Any] | None = None


class AssetOut(ORMModel):
    id: uuid.UUID
    org_id: uuid.UUID
    external_id: str | None
    name: str
    asset_type: str
    latitude: float | None
    longitude: float | None
    geometry: dict[str, Any] | None
    voltage_kv: float | None
    capacity_amps: float | None
    commissioning_year: int | None
    region: str | None
    asset_metadata: dict[str, Any]
    created_at: datetime


class AssetImportResult(BaseModel):
    imported: int
    skipped: int
    errors: list[str] = Field(default_factory=list)
