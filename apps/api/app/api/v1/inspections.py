"""Inspection upload + analysis, listing, detail, stats."""

from __future__ import annotations

import asyncio
import io
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import DbSession, OrgContext, require_role
from app.core.config import settings
from app.core.enums import AnalysisStatus, FaultLevel, Role
from app.core.logging import get_logger
from app.models.asset import Asset
from app.models.inspection import Batch, Inspection
from app.models.organization import Organization
from app.schemas.common import Message
from app.schemas.inspection import (
    BatchOut,
    DashboardStats,
    InspectionDetail,
    InspectionOut,
    TrendPoint,
    TrendResponse,
    UploadResult,
)
from app.services import storage, weather
from app.services.alerts import maybe_send_alert
from app.services.analysis import AnalysisResult, analyze_thermal_image
from app.services.audit import record_audit
from app.services.geo import extract_gps, nearest_asset
from app.services.reports import generate_ai_summary

router = APIRouter(prefix="/inspections", tags=["inspections"])
logger = get_logger("inspections")

InspectorCtx = Annotated[object, Depends(require_role(Role.INSPECTOR))]

_MAX_BATCH = 50
_VISION_CONCURRENCY = 4


def _make_thumbnail(data: bytes) -> bytes | None:
    try:
        img = Image.open(io.BytesIO(data))
        img.thumbnail((480, 480))
        buf = io.BytesIO()
        img.convert("RGB").save(buf, "JPEG", quality=80)
        return buf.getvalue()
    except Exception:  # noqa: BLE001
        return None


def _exif_captured_at(data: bytes) -> datetime | None:
    try:
        exif = Image.open(io.BytesIO(data)).getexif()
        raw = exif.get(36867) or exif.get(306)  # DateTimeOriginal / DateTime
        if raw:
            return datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S").replace(tzinfo=timezone.utc)
    except Exception:  # noqa: BLE001
        pass
    return None


@dataclass
class _Processed:
    filename: str
    image_path: str | None
    thumbnail_path: str | None
    latitude: float | None
    longitude: float | None
    captured_at: datetime | None
    asset_id: uuid.UUID | None
    distance_km: float | None
    analysis: AnalysisResult
    summary: str | None


async def _process_image(
    org: Organization,
    assets: list[Asset],
    filename: str,
    content_type: str,
    data: bytes,
    sem: asyncio.Semaphore,
    manual_captured_at: datetime | None = None,
) -> _Processed:
    inspection_id = uuid.uuid4()
    prefix = f"{org.id}/inspections/{inspection_id}"

    lat, lon = extract_gps(data)
    # Capture date precedence: explicit override from the upload form > EXIF > none.
    captured_at = manual_captured_at or _exif_captured_at(data)
    asset, distance = (None, None)
    if lat is not None and lon is not None:
        asset, distance = nearest_asset(assets, lat, lon)

    # Thresholds: a per-asset-type profile (e.g. stricter for transformers) wins,
    # otherwise the org default.
    org_settings = org.settings or {}
    profiles = org_settings.get("threshold_profiles") or {}
    thresholds = (profiles.get(asset.asset_type) if asset else None) or org_settings.get(
        "thresholds", {}
    )

    # Enrich ambient from local weather at the capture point/date so ΔT is
    # available even when the camera didn't overlay an ambient reading.
    ambient = (
        await weather.ambient_for(lat, lon, captured_at)
        if lat is not None and lon is not None
        else None
    )

    async with sem:
        analysis = await analyze_thermal_image(
            data, content_type, thresholds=thresholds, ambient_temp=ambient
        )

    # Persist original + thumbnail (concurrently).
    ext = "jpg" if "jpeg" in content_type or filename.lower().endswith(("jpg", "jpeg")) else (
        "png" if "png" in content_type else "img"
    )
    thumb = _make_thumbnail(data)
    save_tasks = [storage.save_bytes(f"{prefix}/original.{ext}", data, content_type)]
    if thumb:
        save_tasks.append(storage.save_bytes(f"{prefix}/thumb.jpg", thumb, "image/jpeg"))
    saved = await asyncio.gather(*save_tasks, return_exceptions=True)
    image_path = saved[0] if not isinstance(saved[0], Exception) else None
    thumb_path = saved[1] if thumb and len(saved) > 1 and not isinstance(saved[1], Exception) else None

    summary = None
    if analysis.status == AnalysisStatus.COMPLETED.value:
        transient = Inspection(
            id=inspection_id,
            measured_temp=analysis.measured_temp,
            ambient_temp=analysis.ambient_temp,
            delta_t=analysis.delta_t,
            fault_level=analysis.fault_level,
            priority=analysis.priority,
            analysis_json=analysis.raw,
        )
        summary = await generate_ai_summary(transient, asset, org)

    return _Processed(
        filename=filename,
        image_path=image_path,
        thumbnail_path=thumb_path,
        latitude=lat,
        longitude=lon,
        captured_at=captured_at,
        asset_id=asset.id if asset else None,
        distance_km=distance,
        analysis=analysis,
        summary=summary,
    )


async def _to_out(insp: Inspection) -> InspectionOut:
    image_url, thumb_url = await asyncio.gather(
        storage.get_signed_url(insp.image_path),
        storage.get_signed_url(insp.thumbnail_path),
    )
    out = InspectionOut.model_validate(insp)
    out.image_url = image_url
    out.thumbnail_url = thumb_url
    return out


def _parse_captured_date(value: str | None) -> datetime | None:
    """Parse a 'YYYY-MM-DD' (or full ISO) capture-date override to noon-UTC that day."""
    if not value:
        return None
    try:
        if len(value) == 10:  # date only -> anchor at local-ish midday to avoid tz edge flips
            d = datetime.strptime(value, "%Y-%m-%d")
            return d.replace(hour=12, tzinfo=timezone.utc)
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


@router.post("/upload", response_model=UploadResult, status_code=status.HTTP_201_CREATED)
async def upload(
    ctx: InspectorCtx,
    db: DbSession,
    files: Annotated[list[UploadFile], File(...)],
    captured_date: Annotated[str | None, Form()] = None,
) -> UploadResult:
    if not files:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No files provided")
    manual_captured_at = _parse_captured_date(captured_date)
    if len(files) > _MAX_BATCH:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Max {_MAX_BATCH} images per upload")

    org = await db.get(Organization, ctx.org_id)  # type: ignore[attr-defined]
    assets = (
        await db.execute(
            select(Asset).where(
                Asset.org_id == org.id, Asset.latitude.is_not(None), Asset.longitude.is_not(None)
            )
        )
    ).scalars().all()

    # Read + validate all files up front.
    payloads: list[tuple[str, str, bytes]] = []
    for f in files:
        data = await f.read()
        if not data:
            continue
        if len(data) > settings.max_upload_bytes:
            raise HTTPException(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                f"{f.filename}: exceeds {settings.max_upload_bytes // (1024 * 1024)} MB",
            )
        ctype = f.content_type or "image/jpeg"
        if ctype not in settings.allowed_image_types:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"{f.filename}: unsupported type {ctype}",
            )
        payloads.append((f.filename or "image.jpg", ctype, data))

    if not payloads:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "All files were empty")

    sem = asyncio.Semaphore(_VISION_CONCURRENCY)
    processed = await asyncio.gather(
        *(
            _process_image(org, assets, name, ctype, data, sem, manual_captured_at)
            for name, ctype, data in payloads
        )
    )

    batch = Batch(org_id=org.id, created_by=ctx.user.id, name=None, total=len(processed))  # type: ignore[attr-defined]
    db.add(batch)
    await db.flush()

    inspections: list[Inspection] = []
    for p in processed:
        insp = Inspection(
            org_id=org.id,
            batch_id=batch.id,
            asset_id=p.asset_id,
            created_by=ctx.user.id,  # type: ignore[attr-defined]
            original_filename=p.filename,
            image_path=p.image_path,
            thumbnail_path=p.thumbnail_path,
            captured_at=p.captured_at,
            latitude=p.latitude,
            longitude=p.longitude,
            distance_km=p.distance_km,
            measured_temp=p.analysis.measured_temp,
            ambient_temp=p.analysis.ambient_temp,
            delta_t=p.analysis.delta_t,
            threshold_used=p.analysis.threshold_used,
            confidence=p.analysis.confidence,
            fault_level=p.analysis.fault_level,
            priority=p.analysis.priority,
            analysis_status=p.analysis.status,
            failure_reason=p.analysis.failure_reason,
            analysis_json=p.analysis.raw,
            ai_summary=p.summary,
        )
        db.add(insp)
        inspections.append(insp)

        if p.analysis.fault_level == FaultLevel.CRITICAL.value:
            batch.critical_count += 1
        elif p.analysis.fault_level == FaultLevel.WARNING.value:
            batch.warning_count += 1
        elif p.analysis.fault_level == FaultLevel.NORMAL.value:
            batch.normal_count += 1
        if p.analysis.status == AnalysisStatus.FAILED.value:
            batch.failed_count += 1

    await db.flush()

    # Dispatch alerts for warning/critical inspections.
    for insp in inspections:
        asset = await db.get(Asset, insp.asset_id) if insp.asset_id else None
        await maybe_send_alert(db, org, insp, asset)

    await record_audit(
        db, action="inspection.upload", user_id=ctx.user.id, org_id=org.id,  # type: ignore[attr-defined]
        resource="inspection", details={"count": len(inspections), "batch_id": str(batch.id)},
    )
    await db.commit()
    for insp in inspections:
        await db.refresh(insp)

    outs = await asyncio.gather(*(_to_out(i) for i in inspections))
    return UploadResult(batch=BatchOut.model_validate(batch), inspections=list(outs))


@router.get("", response_model=list[InspectionOut])
async def list_inspections(
    ctx: OrgContext,
    db: DbSession,
    fault_level: str | None = Query(default=None),
    analysis_status: str | None = Query(default=None),
    asset_id: uuid.UUID | None = Query(default=None),
    batch_id: uuid.UUID | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[InspectionOut]:
    stmt = select(Inspection).where(Inspection.org_id == ctx.org_id)
    if fault_level:
        stmt = stmt.where(Inspection.fault_level == fault_level)
    if analysis_status:
        stmt = stmt.where(Inspection.analysis_status == analysis_status)
    if asset_id:
        stmt = stmt.where(Inspection.asset_id == asset_id)
    if batch_id:
        stmt = stmt.where(Inspection.batch_id == batch_id)
    stmt = stmt.order_by(Inspection.created_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    return list(await asyncio.gather(*(_to_out(i) for i in rows)))


@router.get("/stats/dashboard", response_model=DashboardStats)
async def dashboard_stats(ctx: OrgContext, db: DbSession) -> DashboardStats:
    org_id = ctx.org_id
    base = select(func.count()).select_from(Inspection).where(Inspection.org_id == org_id)

    async def count_where(*conds) -> int:
        stmt = base
        for c in conds:
            stmt = stmt.where(c)
        return int(await db.scalar(stmt) or 0)

    since = datetime.now(timezone.utc) - timedelta(hours=24)
    total = await count_where()
    critical = await count_where(Inspection.fault_level == FaultLevel.CRITICAL.value)
    warning = await count_where(Inspection.fault_level == FaultLevel.WARNING.value)
    normal = await count_where(Inspection.fault_level == FaultLevel.NORMAL.value)
    failed = await count_where(Inspection.analysis_status == AnalysisStatus.FAILED.value)
    pending = await count_where(Inspection.analysis_status == AnalysisStatus.PENDING.value)
    last_24h = await count_where(Inspection.created_at >= since)

    avg_temp = await db.scalar(
        select(func.avg(Inspection.measured_temp)).where(Inspection.org_id == org_id)
    )
    avg_delta = await db.scalar(
        select(func.avg(Inspection.delta_t)).where(Inspection.org_id == org_id)
    )
    total_assets = int(
        await db.scalar(select(func.count()).select_from(Asset).where(Asset.org_id == org_id)) or 0
    )

    return DashboardStats(
        total_inspections=total,
        critical_count=critical,
        warning_count=warning,
        normal_count=normal,
        failed_count=failed,
        pending_count=pending,
        avg_measured_temp=round(float(avg_temp), 1) if avg_temp is not None else None,
        avg_delta_t=round(float(avg_delta), 1) if avg_delta is not None else None,
        last_24h=last_24h,
        total_assets=total_assets,
    )


@router.get("/stats/trend", response_model=TrendResponse)
async def stats_trend(
    ctx: OrgContext,
    db: DbSession,
    days: int = Query(default=30, ge=7, le=180),
) -> TrendResponse:
    """Daily inspection volume + severity mix + average temperature over a window."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    rows = (
        await db.execute(
            select(Inspection).where(
                Inspection.org_id == ctx.org_id,
                Inspection.analysis_status == AnalysisStatus.COMPLETED.value,
            )
        )
    ).scalars().all()

    buckets: dict[str, dict] = {}
    for i in range(days, -1, -1):
        d = (now - timedelta(days=i)).date().isoformat()
        buckets[d] = {"total": 0, "critical": 0, "warning": 0, "normal": 0, "temps": []}

    max_temp: float | None = None
    hottest_asset_id = None
    for r in rows:
        ts = r.captured_at or r.created_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        if ts < since:
            continue
        b = buckets.get(ts.date().isoformat())
        if b is None:
            continue
        b["total"] += 1
        lvl = (r.fault_level or "").upper()
        if lvl in ("CRITICAL", "WARNING", "NORMAL"):
            b[lvl.lower()] += 1
        if r.measured_temp is not None:
            b["temps"].append(r.measured_temp)
            if max_temp is None or r.measured_temp > max_temp:
                max_temp, hottest_asset_id = r.measured_temp, r.asset_id

    points = [
        TrendPoint(
            date=d,
            total=b["total"],
            critical=b["critical"],
            warning=b["warning"],
            normal=b["normal"],
            avg_temp=round(sum(b["temps"]) / len(b["temps"]), 1) if b["temps"] else None,
        )
        for d, b in buckets.items()
    ]
    hottest_name = None
    if hottest_asset_id:
        a = await db.get(Asset, hottest_asset_id)
        hottest_name = a.name if a else None
    return TrendResponse(points=points, max_temp=max_temp, hottest_asset=hottest_name)


@router.get("/{inspection_id}", response_model=InspectionDetail)
async def get_inspection(
    inspection_id: uuid.UUID, ctx: OrgContext, db: DbSession
) -> InspectionDetail:
    insp = await db.get(Inspection, inspection_id)
    if not insp or insp.org_id != ctx.org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inspection not found")
    image_url, thumb_url, report_url = await asyncio.gather(
        storage.get_signed_url(insp.image_path),
        storage.get_signed_url(insp.thumbnail_path),
        storage.get_signed_url(insp.report_path),
    )
    asset = await db.get(Asset, insp.asset_id) if insp.asset_id else None
    detail = InspectionDetail.model_validate(insp)
    detail.image_url = image_url
    detail.thumbnail_url = thumb_url
    detail.report_url = report_url
    detail.asset_name = asset.name if asset else None
    return detail


@router.delete("/{inspection_id}", response_model=Message)
async def delete_inspection(
    inspection_id: uuid.UUID, ctx: InspectorCtx, db: DbSession
) -> Message:
    insp = await db.get(Inspection, inspection_id)
    if not insp or insp.org_id != ctx.org_id:  # type: ignore[attr-defined]
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Inspection not found")
    for path in (insp.image_path, insp.thumbnail_path, insp.report_path):
        await storage.delete(path)
    await db.delete(insp)
    await db.commit()
    return Message(message="Inspection deleted")
