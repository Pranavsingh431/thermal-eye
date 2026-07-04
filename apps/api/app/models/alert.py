"""Alert dispatch audit — every notification we send is recorded here."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.enums import AlertChannel
from app.models.base import GUID, JSONType, TimestampMixin, uuid_pk

if TYPE_CHECKING:
    pass


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id: Mapped[uuid.UUID] = uuid_pk()
    org_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("organizations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    inspection_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("inspections.id", ondelete="SET NULL"), index=True, nullable=True
    )
    channel: Mapped[str] = mapped_column(String(20), default=AlertChannel.EMAIL.value, nullable=False)
    level: Mapped[str | None] = mapped_column(String(20), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(300), nullable=True)
    recipients: Mapped[list[str]] = mapped_column(JSONType, default=list, nullable=False)
    ok: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    meta: Mapped[dict[str, Any] | None] = mapped_column(JSONType, nullable=True)
