"""Asset (grid/infrastructure) management + bulk import."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select

from app.api.deps import DbSession, OrgContext, require_role
from app.core.enums import AssetType, Role
from app.models.asset import Asset
from app.schemas.asset import (
    AssetCreate,
    AssetImportResult,
    AssetOut,
    AssetUpdate,
)
from app.schemas.common import Message
from app.services.audit import record_audit
from app.services.geo import parse_grid_file

router = APIRouter(prefix="/assets", tags=["assets"])

InspectorCtx = Annotated[object, Depends(require_role(Role.INSPECTOR))]
AdminCtx = Annotated[object, Depends(require_role(Role.ADMIN))]

_VALID_TYPES = {t.value for t in AssetType}


@router.get("", response_model=list[AssetOut])
async def list_assets(
    ctx: OrgContext,
    db: DbSession,
    asset_type: str | None = Query(default=None),
    q: str | None = Query(default=None, description="search by name/external_id"),
    limit: int = Query(default=2000, le=5000),
    offset: int = Query(default=0, ge=0),
) -> list[AssetOut]:
    stmt = select(Asset).where(Asset.org_id == ctx.org_id)
    if asset_type:
        stmt = stmt.where(Asset.asset_type == asset_type)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(Asset.name).like(like) | func.lower(func.coalesce(Asset.external_id, "")).like(like)
        )
    stmt = stmt.order_by(Asset.created_at.desc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    return [AssetOut.model_validate(a) for a in rows]


@router.post("", response_model=AssetOut, status_code=status.HTTP_201_CREATED)
async def create_asset(payload: AssetCreate, ctx: InspectorCtx, db: DbSession) -> AssetOut:
    asset = Asset(org_id=ctx.org_id, **payload.model_dump())  # type: ignore[attr-defined]
    asset.asset_type = payload.asset_type.value
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return AssetOut.model_validate(asset)


@router.patch("/{asset_id}", response_model=AssetOut)
async def update_asset(
    asset_id: uuid.UUID, payload: AssetUpdate, ctx: InspectorCtx, db: DbSession
) -> AssetOut:
    asset = await db.get(Asset, asset_id)
    if not asset or asset.org_id != ctx.org_id:  # type: ignore[attr-defined]
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "asset_type" and value is not None:
            value = value.value if isinstance(value, AssetType) else value
        setattr(asset, field, value)
    await db.commit()
    await db.refresh(asset)
    return AssetOut.model_validate(asset)


@router.delete("/{asset_id}", response_model=Message)
async def delete_asset(asset_id: uuid.UUID, ctx: AdminCtx, db: DbSession) -> Message:
    asset = await db.get(Asset, asset_id)
    if not asset or asset.org_id != ctx.org_id:  # type: ignore[attr-defined]
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    await db.delete(asset)
    await db.commit()
    return Message(message="Asset deleted")


@router.post("/import", response_model=AssetImportResult)
async def import_assets(
    ctx: InspectorCtx,
    db: DbSession,
    file: Annotated[UploadFile, File(...)],
    replace: bool = Query(default=False, description="delete existing assets first"),
) -> AssetImportResult:
    data = await file.read()
    if len(data) > 25 * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File too large (max 25 MB)")
    try:
        items = parse_grid_file(file.filename or "", data)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from None
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Could not parse file: {exc}") from None

    org_id = ctx.org_id  # type: ignore[attr-defined]
    if replace:
        await db.execute(sa_delete(Asset).where(Asset.org_id == org_id))

    imported, skipped, errors = 0, 0, []
    for item in items:
        try:
            atype = item.get("asset_type") or AssetType.TOWER.value
            if atype not in _VALID_TYPES:
                atype = AssetType.OTHER.value
            db.add(
                Asset(
                    org_id=org_id,
                    external_id=(str(item["external_id"]) if item.get("external_id") else None),
                    name=str(item.get("name") or "Asset")[:200],
                    asset_type=atype,
                    latitude=item.get("latitude"),
                    longitude=item.get("longitude"),
                    geometry=item.get("geometry"),
                    voltage_kv=item.get("voltage_kv"),
                    region=item.get("region"),
                    asset_metadata=item.get("asset_metadata") or {},
                )
            )
            imported += 1
        except Exception as exc:  # noqa: BLE001
            skipped += 1
            if len(errors) < 20:
                errors.append(str(exc))

    await record_audit(
        db, action="assets.import", user_id=ctx.user.id, org_id=org_id,  # type: ignore[attr-defined]
        resource="asset", details={"imported": imported, "skipped": skipped, "replace": replace},
    )
    await db.commit()
    return AssetImportResult(imported=imported, skipped=skipped, errors=errors)
