"""Generate and retrieve inspection reports (branded HTML/PDF)."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from sqlalchemy import select

from app.api.deps import DbSession, OrgContext, require_role
from app.core.enums import AnalysisStatus, Role
from app.models.asset import Asset
from app.models.inspection import Inspection
from app.models.organization import Organization
from app.services import storage
from app.services.predictive import compute_asset_health
from app.services.reports import generate_ai_summary, render_report_html, render_report_pdf

router = APIRouter(prefix="/reports", tags=["reports"])

InspectorCtx = Annotated[object, Depends(require_role(Role.INSPECTOR))]


class ReportOut(BaseModel):
    report_url: str | None
    format: str


@router.post("/inspections/{inspection_id}", response_model=ReportOut)
async def generate_inspection_report(
    inspection_id: uuid.UUID, ctx: InspectorCtx, db: DbSession
) -> ReportOut:
    insp = await db.get(Inspection, inspection_id)
    if not insp or insp.org_id != ctx.org_id:  # type: ignore[attr-defined]
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inspection not found")
    if insp.measured_temp is None:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Cannot report on a failed analysis (no temperature reading).",
        )

    org = await db.get(Organization, insp.org_id)
    asset = await db.get(Asset, insp.asset_id) if insp.asset_id else None
    image_url = await storage.get_signed_url(insp.image_path, expires_in=3600)

    # Defensive: if the narrative wasn't produced at upload time, generate it now
    # so the report is never blank.
    if not (insp.ai_summary or "").strip():
        insp.ai_summary = await generate_ai_summary(insp, asset, org)

    # Predictive context: if this asset has a worsening trend, surface the forecast.
    trend_note: str | None = None
    if asset is not None:
        thresholds = (org.settings or {}).get("thresholds", {})
        history = (
            await db.execute(
                select(Inspection).where(
                    Inspection.asset_id == asset.id,
                    Inspection.analysis_status == AnalysisStatus.COMPLETED.value,
                )
            )
        ).scalars().all()
        health = compute_asset_health(asset, list(history), thresholds)
        if health.trend in ("worsening", "improving") and health.slope_c_per_month is not None:
            trend_note = health.recommendation

    html = render_report_html(org, insp, asset, image_url, trend_note=trend_note)
    pdf = await render_report_pdf(html)

    if pdf:
        path = f"{org.id}/reports/{insp.id}.pdf"
        await storage.save_bytes(path, pdf, "application/pdf")
        fmt = "pdf"
    else:
        path = f"{org.id}/reports/{insp.id}.html"
        await storage.save_bytes(path, html.encode(), "text/html")
        fmt = "html"

    insp.report_path = path
    await db.commit()
    return ReportOut(report_url=await storage.get_signed_url(path), format=fmt)


@router.get("/inspections/{inspection_id}", response_model=ReportOut)
async def get_inspection_report(
    inspection_id: uuid.UUID, ctx: OrgContext, db: DbSession
) -> ReportOut:
    insp = await db.get(Inspection, inspection_id)
    if not insp or insp.org_id != ctx.org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inspection not found")
    if not insp.report_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No report generated yet")
    fmt = "pdf" if insp.report_path.endswith(".pdf") else "html"
    return ReportOut(report_url=await storage.get_signed_url(insp.report_path), format=fmt)
