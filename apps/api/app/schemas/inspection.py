"""Inspection schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.common import ORMModel


class InspectionOut(ORMModel):
    id: uuid.UUID
    org_id: uuid.UUID
    batch_id: uuid.UUID | None
    asset_id: uuid.UUID | None
    original_filename: str | None
    image_url: str | None = None
    thumbnail_url: str | None = None
    captured_at: datetime | None
    latitude: float | None
    longitude: float | None
    distance_km: float | None
    measured_temp: float | None
    ambient_temp: float | None
    delta_t: float | None
    threshold_used: float | None
    confidence: float | None
    fault_level: str | None
    priority: str | None
    analysis_status: str
    failure_reason: str | None
    ai_summary: str | None
    created_at: datetime


class InspectionDetail(InspectionOut):
    analysis_json: dict[str, Any] | None = None
    asset_name: str | None = None
    report_url: str | None = None


class BatchOut(ORMModel):
    id: uuid.UUID
    org_id: uuid.UUID
    name: str | None
    total: int
    critical_count: int
    warning_count: int
    normal_count: int
    failed_count: int
    combined_report_path: str | None
    created_at: datetime


class UploadResult(BaseModel):
    batch: BatchOut | None = None
    inspections: list[InspectionOut]


class DashboardStats(BaseModel):
    total_inspections: int
    critical_count: int
    warning_count: int
    normal_count: int
    failed_count: int
    pending_count: int
    avg_measured_temp: float | None
    avg_delta_t: float | None
    last_24h: int
    total_assets: int


class TrendPoint(BaseModel):
    date: str  # YYYY-MM-DD
    total: int
    critical: int
    warning: int
    normal: int
    avg_temp: float | None


class TrendResponse(BaseModel):
    points: list[TrendPoint]
    max_temp: float | None
    hottest_asset: str | None
