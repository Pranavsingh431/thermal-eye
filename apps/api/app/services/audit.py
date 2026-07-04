"""Audit-log helper."""

from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.audit import AuditLog

logger = get_logger("audit")


async def record_audit(
    db: AsyncSession,
    *,
    action: str,
    user_id: uuid.UUID | None = None,
    user_email: str | None = None,
    org_id: uuid.UUID | None = None,
    resource: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: dict[str, Any] | None = None,
    commit: bool = False,
) -> None:
    """Append an audit entry. Never raises — auditing must not break the request."""
    try:
        db.add(
            AuditLog(
                action=action,
                user_id=user_id,
                user_email=user_email,
                org_id=org_id,
                resource=resource,
                ip_address=ip_address,
                user_agent=user_agent,
                details=details,
            )
        )
        if commit:
            await db.commit()
        else:
            await db.flush()
    except Exception as exc:  # noqa: BLE001
        logger.warning("audit_failed", action=action, error=str(exc))
