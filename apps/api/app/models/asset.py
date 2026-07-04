"""Asset model — the customer's own grid/infrastructure (towers, lines, substations...)."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import AssetType
from app.models.base import GUID, JSONType, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    from app.models.inspection import Inspection
    from app.models.organization import Organization


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"
    __table_args__ = (
        Index("ix_assets_org_type", "org_id", "asset_type"),
        Index("ix_assets_org_extid", "org_id", "external_id"),
    )

    id: Mapped[uuid.UUID] = uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # The customer's own identifier (e.g. "TWR-110-085", "Bhira-Khopoli L2")
    external_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(30), default=AssetType.TOWER.value, nullable=False)

    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    # GeoJSON geometry for lines/polygons (points use lat/lon above)
    geometry: Mapped[dict[str, Any] | None] = mapped_column(JSONType, nullable=True)

    voltage_kv: Mapped[float | None] = mapped_column(Float, nullable=True)
    capacity_amps: Mapped[float | None] = mapped_column(Float, nullable=True)
    commissioning_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)

    asset_metadata: Mapped[dict[str, Any]] = mapped_column(JSONType, default=dict, nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="assets")
    inspections: Mapped[list["Inspection"]] = relationship(back_populates="asset")
