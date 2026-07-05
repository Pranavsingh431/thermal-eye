"""Domain enumerations, stored as strings for painless migrations."""

from __future__ import annotations

try:  # Python 3.11+
    from enum import StrEnum
except ImportError:  # Python 3.10 backport — members are real strs; str() is the value
    from enum import Enum

    class StrEnum(str, Enum):
        __str__ = str.__str__


class Role(StrEnum):
    OWNER = "owner"
    ADMIN = "admin"
    INSPECTOR = "inspector"
    VIEWER = "viewer"

    @property
    def rank(self) -> int:
        return {"viewer": 0, "inspector": 1, "admin": 2, "owner": 3}[self.value]


class AssetType(StrEnum):
    TOWER = "tower"
    LINE = "line"
    SUBSTATION = "substation"
    TRANSFORMER = "transformer"
    INSULATOR = "insulator"
    SOLAR_PANEL = "solar_panel"
    EQUIPMENT = "equipment"
    OTHER = "other"


class FaultLevel(StrEnum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class Priority(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AnalysisStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AlertChannel(StrEnum):
    EMAIL = "email"
    WEBHOOK = "webhook"
