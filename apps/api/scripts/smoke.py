"""End-to-end smoke test against an in-process SQLite DB (no external services).

Exercises: register -> me -> create asset -> import CSV -> upload image
(analysis fails *honestly* with no OpenRouter key -> proves no fabricated data)
-> dashboard stats. Run: `python scripts/smoke.py`
"""

from __future__ import annotations

import asyncio
import io
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # make `app` importable

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./smoke.db")
os.environ.setdefault("DATABASE_URL_SYNC", "sqlite:///./smoke.db")
os.environ.setdefault("SECRET_KEY", "smoke-test-secret-key-please-change")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("AUTO_CREATE_TABLES", "1")
os.environ.setdefault("OPENROUTER_API_KEY", "")  # force honest analysis failure

# Fresh DB each run.
for f in ("smoke.db",):
    if os.path.exists(f):
        os.remove(f)

from httpx import ASGITransport, AsyncClient  # noqa: E402
from PIL import Image  # noqa: E402

from app.main import app  # noqa: E402


def tiny_png() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), (200, 30, 30)).save(buf, "PNG")
    return buf.getvalue()


def check(name: str, cond: bool, extra: str = "") -> None:
    print(f"  {'✅' if cond else '❌'} {name} {extra}")
    if not cond:
        raise SystemExit(f"FAILED: {name} {extra}")


async def main() -> None:
    transport = ASGITransport(app=app)
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            print("· auth")
            r = await c.post("/api/v1/auth/register", json={
                "email": "owner@acme.com", "password": "SuperSecret123",
                "full_name": "Ada Owner", "organization_name": "Acme Power",
            })
            check("register 201", r.status_code == 201, str(r.status_code))
            tokens = r.json()
            hdr = {"Authorization": f"Bearer {tokens['access_token']}"}

            r = await c.get("/api/v1/auth/me", headers=hdr)
            check("me returns org", r.status_code == 200 and r.json()["active_role"] == "owner")

            print("· tenant isolation")
            r2 = await c.post("/api/v1/auth/register", json={
                "email": "eve@evil.com", "password": "SuperSecret123",
                "full_name": "Eve", "organization_name": "Evil Inc",
            })
            eve_hdr = {"Authorization": f"Bearer {r2.json()['access_token']}"}

            print("· assets")
            r = await c.post("/api/v1/assets", headers=hdr, json={
                "name": "TWR-110-085", "asset_type": "tower",
                "latitude": 19.076, "longitude": 72.8777, "voltage_kv": 110,
            })
            check("create asset", r.status_code == 201, str(r.status_code))

            csv_bytes = b"name,latitude,longitude,voltage_kv\nTWR-2,19.08,72.88,220\n"
            r = await c.post(
                "/api/v1/assets/import", headers=hdr,
                files={"file": ("grid.csv", csv_bytes, "text/csv")},
            )
            check("csv import", r.status_code == 200 and r.json()["imported"] == 1, r.text[:120])

            # Eve must NOT see Acme's assets.
            r = await c.get("/api/v1/assets", headers=eve_hdr)
            check("cross-tenant isolation", r.status_code == 200 and r.json() == [], r.text[:120])

            print("· upload + HONEST analysis failure (no OpenRouter key)")
            r = await c.post(
                "/api/v1/inspections/upload", headers=hdr,
                files={"files": ("thermal.png", tiny_png(), "image/png")},
            )
            check("upload 201", r.status_code == 201, r.text[:200])
            insp = r.json()["inspections"][0]
            check(
                "no fabricated temp on failure",
                insp["analysis_status"] == "failed" and insp["measured_temp"] is None,
                f"status={insp['analysis_status']} temp={insp['measured_temp']}",
            )

            print("· dashboard")
            r = await c.get("/api/v1/inspections/stats/dashboard", headers=hdr)
            j = r.json()
            check("stats", r.status_code == 200 and j["total_inspections"] == 1 and j["failed_count"] == 1, r.text[:150])

            print("· authz")
            r = await c.get("/api/v1/assets")
            check("401 without token", r.status_code == 401)

    print("\n🎉 ALL SMOKE CHECKS PASSED")


if __name__ == "__main__":
    asyncio.run(main())
