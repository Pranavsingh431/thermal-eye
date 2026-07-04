"""Liveness & readiness probes."""

from __future__ import annotations

from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/healthz")
async def healthz() -> dict:
    return {"status": "ok", "service": settings.project_name, "env": settings.environment}


@router.get("/readyz")
async def readyz(db: DbSession) -> dict:
    try:
        await db.execute(text("SELECT 1"))
        return {"status": "ready", "database": "ok"}
    except Exception as exc:  # noqa: BLE001
        return {"status": "degraded", "database": f"error: {exc}"}
