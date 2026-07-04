"""Alerting: notify the right people when an inspection is WARNING/CRITICAL."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.enums import FaultLevel
from app.models.alert import Alert
from app.models.asset import Asset
from app.models.inspection import Inspection
from app.models.organization import Organization
from app.services.email import send_email

_ALERTABLE = {FaultLevel.WARNING.value, FaultLevel.CRITICAL.value}


def resolve_recipients(org: Organization) -> list[str]:
    configured = (org.settings or {}).get("alert_recipients") or []
    configured = [str(e).strip() for e in configured if str(e).strip()]
    return configured or [settings.default_alert_recipient]


def _render_alert_html(org: Organization, inspection: Inspection, asset: Asset | None) -> str:
    color = "#dc2626" if inspection.fault_level == FaultLevel.CRITICAL.value else "#d97706"
    asset_label = asset.name if asset else "Unmatched location"
    loc = (
        f"{inspection.latitude:.5f}, {inspection.longitude:.5f}"
        if inspection.latitude is not None and inspection.longitude is not None
        else "Unknown"
    )
    delta = f"{inspection.delta_t:.1f} °C" if inspection.delta_t is not None else "—"
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto">
      <div style="background:{color};color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
        <h2 style="margin:0">{inspection.fault_level} thermal alert</h2>
        <div style="opacity:.9">{org.name}</div>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:0;padding:20px;border-radius:0 0 10px 10px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="color:#6b7280;padding:6px 0">Asset</td><td><b>{asset_label}</b></td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Measured temp</td>
              <td><b>{inspection.measured_temp} °C</b></td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Ambient</td>
              <td>{inspection.ambient_temp if inspection.ambient_temp is not None else '—'} °C</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">ΔT</td><td>{delta}</td></tr>
          <tr><td style="color:#6b7280;padding:6px 0">Location</td><td>{loc}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px;margin-top:16px">
          {inspection.ai_summary or ''}
        </p>
      </div>
    </div>
    """


async def maybe_send_alert(
    db: AsyncSession, org: Organization, inspection: Inspection, asset: Asset | None
) -> Alert | None:
    if not (org.settings or {}).get("alerts_enabled", True):
        return None
    if inspection.fault_level not in _ALERTABLE:
        return None

    recipients = resolve_recipients(org)
    subject = (
        f"[{inspection.fault_level}] Thermal alert — "
        f"{(asset.name if asset else 'location')} · {inspection.measured_temp}°C"
    )
    html = _render_alert_html(org, inspection, asset)
    ok, error = await send_email(recipients, subject, html)

    alert = Alert(
        org_id=org.id,
        inspection_id=inspection.id,
        level=inspection.fault_level,
        subject=subject,
        recipients=recipients,
        ok=ok,
        error=error,
        meta={"measured_temp": inspection.measured_temp},
    )
    db.add(alert)
    return alert


def alert_meta(inspection: Inspection) -> dict[str, Any]:
    return {"level": inspection.fault_level, "temp": inspection.measured_temp}
