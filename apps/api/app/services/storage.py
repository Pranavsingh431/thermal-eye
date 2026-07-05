"""File storage abstraction: Supabase Storage in prod, local disk in dev.

All objects are stored under a tenant-prefixed key (``{org_id}/...``) so a bug in
one tenant's code path can't reach another tenant's files.
"""

from __future__ import annotations

from pathlib import Path

import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("storage")

USING_SUPABASE = bool(settings.supabase_url and settings.supabase_service_role_key)
LOCAL_DIR = Path("var/storage")


def _supabase_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {settings.supabase_service_role_key}"}


async def save_bytes(path: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """Persist bytes at ``path`` (relative key). Returns the stored key."""
    if USING_SUPABASE:
        url = (
            f"{settings.supabase_url}/storage/v1/object/"
            f"{settings.supabase_storage_bucket}/{path}"
        )
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                url,
                headers={**_supabase_headers(), "Content-Type": content_type, "x-upsert": "true"},
                content=data,
            )
            resp.raise_for_status()
        return path

    dest = LOCAL_DIR / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return path


async def get_signed_url(path: str | None, expires_in: int = 3600) -> str | None:
    if not path:
        return None
    if USING_SUPABASE:
        url = (
            f"{settings.supabase_url}/storage/v1/object/sign/"
            f"{settings.supabase_storage_bucket}/{path}"
        )
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    url, headers=_supabase_headers(), json={"expiresIn": expires_in}
                )
                resp.raise_for_status()
                signed = resp.json().get("signedURL")
            if signed:
                return f"{settings.supabase_url}/storage/v1{signed}"
        except Exception as exc:  # noqa: BLE001
            logger.warning("signed_url_failed", path=path, error=str(exc))
        return None
    # Dev: served by the API's static mount (see main.py). Return an ABSOLUTE URL
    # so the browser (served from the web origin) resolves it against the API,
    # not the front-end origin.
    base = settings.public_api_url.rstrip("/")
    return f"{base}/files/{path}"


async def delete(path: str | None) -> None:
    if not path:
        return
    if USING_SUPABASE:
        url = (
            f"{settings.supabase_url}/storage/v1/object/"
            f"{settings.supabase_storage_bucket}/{path}"
        )
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                await client.delete(url, headers=_supabase_headers())
        except Exception as exc:  # noqa: BLE001
            logger.warning("storage_delete_failed", path=path, error=str(exc))
    else:
        target = LOCAL_DIR / path
        if target.exists():
            target.unlink()
