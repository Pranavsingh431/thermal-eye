"""Organization (tenant) model."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import JSONType, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.asset import Asset
    from app.models.inspection import Batch, Inspection
    from app.models.user import Membership


DEFAULT_SETTINGS: dict[str, Any] = {
    # Temperature model (per-org, replaces the old hard-coded Tata Power thresholds)
    "thresholds": {
        # delta-T (measured - ambient) based classification, °C
        "warning_delta": 15,
        "critical_delta": 30,
        # absolute temperature guardrails, °C
        "warning_abs": 60,
        "critical_abs": 80,
    },
    "units": "celsius",  # celsius | fahrenheit
    "emissivity": 0.95,
    "timezone": "Asia/Kolkata",
    "alert_recipients": [],  # falls back to DEFAULT_ALERT_RECIPIENT when empty
    "alerts_enabled": True,
    "map": {"center": [20.5937, 78.9629], "zoom": 5},  # default: India; org can override
    # ROI model: typical cost of an unplanned failure per asset type (used to
    # quantify "value at risk"). Rough order-of-magnitude defaults in INR.
    "currency": "INR",
    "failure_costs": {
        "transformer": 6000000,  # ₹60L
        "substation": 4000000,  # ₹40L
        "line": 800000,  # ₹8L
        "tower": 500000,  # ₹5L
        "insulator": 150000,  # ₹1.5L
        "solar_panel": 100000,  # ₹1L
        "equipment": 300000,
        "other": 300000,
    },
}


class Organization(Base, TimestampMixin):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)

    # Branding (white-label)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[str] = mapped_column(String(9), default="#2563eb", nullable=False)
    accent_color: Mapped[str] = mapped_column(String(9), default="#f97316", nullable=False)

    industry: Mapped[str | None] = mapped_column(String(80), nullable=True)
    plan: Mapped[str] = mapped_column(String(40), default="pilot", nullable=False)

    settings: Mapped[dict[str, Any]] = mapped_column(
        JSONType, default=lambda: dict(DEFAULT_SETTINGS), nullable=False
    )

    memberships: Mapped[list["Membership"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    assets: Mapped[list["Asset"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    inspections: Mapped[list["Inspection"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
    batches: Mapped[list["Batch"]] = relationship(
        back_populates="organization", cascade="all, delete-orphan"
    )
