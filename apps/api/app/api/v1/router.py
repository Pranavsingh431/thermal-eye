"""Aggregate all v1 routers."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import assets, auth, health, inspections, orgs, reports

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(orgs.router)
api_router.include_router(assets.router)
api_router.include_router(inspections.router)
api_router.include_router(reports.router)
