"""Inspection (single thermal image analysis) and Batch (upload session) models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import AnalysisStatus
from app.models.base import GUID, JSONType, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.organization import Organization


class Batch(Base, TimestampMixin):
    __tablename__ = "batches"

    id: Mapped[uuid.UUID] = uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    total: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    critical_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    warning_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    normal_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failed_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    combined_report_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="batches")
    inspections: Mapped[list["Inspection"]] = relationship(back_populates="batch")


class Inspection(Base, TimestampMixin):
    __tablename__ = "inspections"
    __table_args__ = (
        Index("ix_inspections_org_created", "org_id", "created_at"),
        Index("ix_inspections_org_fault", "org_id", "fault_level"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    batch_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("batches.id", ondelete="SET NULL"), index=True, nullable=True
    )
    asset_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("assets.id", ondelete="SET NULL"), index=True, nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Source
    original_filename: Mapped[str | None] = mapped_column(String(300), nullable=True)
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    thumbnail_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    captured_at: Mapped[datetime | None] = mapped_column(nullable=True)

    # Location (from EXIF or matched asset)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Measurements — NULL when analysis fails (never fabricated)
    measured_temp: Mapped[float | None] = mapped_column(Float, nullable=True)
    ambient_temp: Mapped[float | None] = mapped_column(Float, nullable=True)
    delta_t: Mapped[float | None] = mapped_column(Float, nullable=True)
    threshold_used: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    fault_level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    priority: Mapped[str | None] = mapped_column(String(20), nullable=True)

    analysis_status: Mapped[str] = mapped_column(
        String(20), default=AnalysisStatus.PENDING.value, nullable=False
    )
    failure_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    analysis_json: Mapped[dict[str, Any] | None] = mapped_column(JSONType, nullable=True)
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    report_path: Mapped[str | None] = mapped_column(String(500), nullable=True)

    organization: Mapped["Organization"] = relationship(back_populates="inspections")
    asset: Mapped["Asset | None"] = relationship(back_populates="inspections")
    batch: Mapped["Batch | None"] = relationship(back_populates="inspections")
