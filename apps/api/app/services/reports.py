"""Report generation: AI narrative + branded, print-ready HTML, optional PDF.

The report is designed to be board- and field-ready: a clear verdict, the exact
measurements, the thermal frame, a structured AI analysis, and an integrity note
that makes the platform's "never fabricate a reading" guarantee explicit.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from html import escape

from app.core.logging import get_logger
from app.models.asset import Asset
from app.models.inspection import Inspection
from app.models.organization import Organization
from app.services.openrouter import OpenRouterError, text_completion

logger = get_logger("reports")

_SYSTEM = (
    "You are a senior certified thermographer (Level II) writing the findings section of a "
    "professional electrical/industrial thermal inspection report. Write with precision and "
    "authority for an asset-management audience. Use ONLY the measurements provided — never "
    "invent or estimate values. Be specific about the likely failure mechanism and give a "
    "concrete, prioritized recommendation.\n\n"
    "Output EXACTLY three sections, each started by its label on its own line:\n"
    "Assessment:\n"
    "Likely cause:\n"
    "Recommended action:\n"
    "Keep each section to 2–4 sentences. Do not add other sections or preamble."
)

_LEVEL_META = {
    "CRITICAL": ("#dc2626", "Critical", "Immediate attention required"),
    "WARNING": ("#d97706", "Warning", "Investigate at the next opportunity"),
    "NORMAL": ("#16a34a", "Normal", "Within acceptable limits"),
}


async def generate_ai_summary(
    inspection: Inspection, asset: Asset | None, org: Organization
) -> str:
    """Produce a structured thermographer narrative for the inspection."""
    facts = (
        f"Organization: {org.name}\n"
        f"Asset: {asset.name if asset else 'unmatched location'}"
        f"{f' ({asset.external_id})' if asset and asset.external_id else ''}\n"
        f"Asset type: {asset.asset_type if asset else 'unknown'}\n"
        f"Voltage: {f'{asset.voltage_kv} kV' if asset and asset.voltage_kv else 'unknown'}\n"
        f"Measured temperature: {inspection.measured_temp} °C\n"
        f"Ambient temperature: {inspection.ambient_temp if inspection.ambient_temp is not None else 'unknown'} °C\n"
        f"Delta-T (rise over ambient): "
        f"{inspection.delta_t if inspection.delta_t is not None else 'n/a'} °C\n"
        f"Classification: {inspection.fault_level} (priority {inspection.priority})\n"
        f"Vision-model notes: {(inspection.analysis_json or {}).get('hotspot_description', 'n/a')}\n"
    )
    try:
        return await text_completion(_SYSTEM, facts, max_tokens=500)
    except (OpenRouterError, Exception) as exc:  # noqa: BLE001
        logger.warning("ai_summary_fallback", error=str(exc))
        level = (inspection.fault_level or "NORMAL").upper()
        dt = inspection.delta_t
        action = (
            "No action beyond routine monitoring; re-inspect at the next scheduled maintenance window."
            if level == "NORMAL"
            else (
                "Schedule a physical inspection of the hotspot within the standard window; verify "
                "connector torque and contact condition."
                if level == "WARNING"
                else "Dispatch a crew to inspect and remediate this hotspot on a priority basis; "
                "consider load reduction until the connection is verified."
            )
        )
        return (
            f"Assessment:\nThe target measured {inspection.measured_temp} °C"
            f"{f' (ΔT {dt} °C over ambient)' if dt is not None else ''}, classified {level} "
            "against the organization's thresholds.\n\n"
            "Likely cause:\nAn elevated temperature rise at an electrical connection typically "
            "indicates increased contact resistance — a loose, corroded or oxidised joint, or "
            "conductor strand damage under load.\n\n"
            f"Recommended action:\n{action}"
        )


def _split_sections(summary: str) -> list[tuple[str, str]]:
    """Parse the 3-section thermographer narrative into (heading, body) pairs."""
    if not summary:
        return []
    labels = ["Assessment", "Likely cause", "Recommended action"]
    pattern = re.compile(r"(?im)^\s*(assessment|likely cause|recommended action)\s*:\s*")
    parts = pattern.split(summary)
    if len(parts) <= 1:
        return [("Analysis", summary.strip())]
    out: list[tuple[str, str]] = []
    # parts = ['', label1, body1, label2, body2, ...]
    it = iter(parts[1:])
    for label, body in zip(it, it):
        canonical = next((l for l in labels if l.lower() == label.strip().lower()), label.title())
        out.append((canonical, body.strip()))
    return out or [("Analysis", summary.strip())]


def render_report_html(
    org: Organization,
    inspection: Inspection,
    asset: Asset | None,
    image_url: str | None,
    *,
    trend_note: str | None = None,
) -> str:
    primary = org.primary_color or "#2563eb"
    level = (inspection.fault_level or "N/A").upper()
    level_color, level_label, level_sub = _LEVEL_META.get(
        level, ("#6b7280", level.title(), "")
    )
    generated = datetime.now(timezone.utc).strftime("%d %b %Y · %H:%M UTC")
    report_id = str(inspection.id)[:8].upper()

    logo = (
        f'<img src="{escape(org.logo_url)}" style="height:38px" alt="{escape(org.name)}">'
        if org.logo_url
        else f'<div style="font-size:20px;font-weight:800;color:{primary}">{escape(org.name)}</div>'
    )
    img = (
        f'<img src="{escape(image_url)}" style="width:100%;border-radius:10px;'
        f'border:1px solid #e5e7eb;display:block">'
        if image_url
        else '<div style="height:240px;display:flex;align-items:center;justify-content:center;'
        'color:#9ca3af;background:#f9fafb;border-radius:10px">No image available</div>'
    )

    def metric(label: str, value: str, *, accent: str | None = None) -> str:
        color = accent or "#111827"
        return (
            '<div style="padding:12px 14px;border:1px solid #eef0f3;border-radius:10px;background:#fff">'
            f'<div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af">{label}</div>'
            f'<div style="font-size:18px;font-weight:700;color:{color};margin-top:2px">{value}</div>'
            "</div>"
        )

    def row(label: str, value: str) -> str:
        return (
            '<tr>'
            f'<td style="color:#6b7280;padding:7px 0;font-size:13px">{label}</td>'
            f'<td style="font-weight:600;text-align:right;font-size:13px">{value}</td>'
            "</tr>"
        )

    delta_str = f"{inspection.delta_t} °C" if inspection.delta_t is not None else "—"
    ambient_str = f"{inspection.ambient_temp} °C" if inspection.ambient_temp is not None else "—"
    conf_str = f"{int((inspection.confidence or 0) * 100)}%" if inspection.confidence else "—"
    loc_str = (
        f"{inspection.latitude:.5f}, {inspection.longitude:.5f}"
        if inspection.latitude is not None and inspection.longitude is not None
        else "—"
    )

    sections_html = "".join(
        (
            '<div style="margin-bottom:14px">'
            f'<div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;'
            f'color:{primary};margin-bottom:4px">{escape(heading)}</div>'
            f'<div style="font-size:13.5px;line-height:1.6;color:#1f2937">{escape(body).strip()}</div>'
            "</div>"
        )
        for heading, body in _split_sections(inspection.ai_summary or "")
    )

    trend_block = (
        '<div style="margin-top:16px;padding:14px 16px;border-radius:10px;background:#fff7ed;'
        'border:1px solid #fed7aa">'
        '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;'
        'color:#c2410c;margin-bottom:3px">Predictive maintenance</div>'
        f'<div style="font-size:13px;line-height:1.55;color:#7c2d12">{escape(trend_note)}</div>'
        "</div>"
        if trend_note
        else ""
    )

    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>
  @page {{ size: A4; margin: 20mm 16mm; }}
  * {{ box-sizing: border-box; }}
  /* Always render light — a report must look identical whether the viewer's
     browser/OS is in light or dark mode. */
  html {{ color-scheme: light; background:#ffffff; }}
  body {{ font-family:'Helvetica Neue',Arial,sans-serif; color:#111827; margin:0;
          background:#ffffff; }}
  .wrap {{ max-width: 820px; margin: 0 auto; background:#ffffff; padding: 8px; }}
  .header {{ display:flex; justify-content:space-between; align-items:flex-start;
             border-bottom:3px solid {primary}; padding-bottom:14px; }}
  .verdict {{ display:flex; align-items:center; gap:14px; margin:22px 0;
              padding:16px 18px; border-radius:12px; background:{level_color}12;
              border:1px solid {level_color}40; }}
  .chip {{ background:{level_color}; color:#fff; padding:6px 16px; border-radius:999px;
           font-weight:700; font-size:13px; letter-spacing:.03em; white-space:nowrap; }}
  .grid2 {{ display:flex; gap:18px; margin-top:4px; }}
  .card {{ border:1px solid #eef0f3; border-radius:12px; padding:18px; background:#ffffff; }}
  h1 {{ font-size:19px; margin:0; }}
  .muted {{ color:#6b7280; font-size:12px; }}
  table {{ width:100%; border-collapse:collapse; }}
  .metrics {{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-bottom:14px; }}
  .foot {{ margin-top:22px; padding-top:12px; border-top:1px solid #eef0f3;
           display:flex; justify-content:space-between; align-items:center; }}
</style></head><body><div class="wrap">

  <div class="header">
    <div>
      {logo}
      <div class="muted" style="margin-top:6px">Thermal Inspection Report</div>
    </div>
    <div style="text-align:right">
      <div class="chip">{escape(level_label)}</div>
      <div class="muted" style="margin-top:8px">Report #{report_id}</div>
      <div class="muted">{generated}</div>
    </div>
  </div>

  <div style="margin-top:18px">
    <h1>{escape(asset.name if asset else 'Unmatched location')}</h1>
    <div class="muted" style="margin-top:3px">
      {escape(asset.asset_type if asset else 'Location')}
      {f" · {asset.voltage_kv} kV" if asset and asset.voltage_kv else ""}
      {f" · {escape(asset.external_id)}" if asset and asset.external_id else ""}
    </div>
  </div>

  <div class="verdict">
    <span class="chip">{escape(level_label)}</span>
    <div>
      <div style="font-weight:700;font-size:15px">{escape(level_sub)}</div>
      <div class="muted">Measured {inspection.measured_temp} °C · ΔT {delta_str} · classified against {escape(org.name)} thresholds</div>
    </div>
  </div>

  <div class="metrics">
    {metric("Measured", f"{inspection.measured_temp} °C", accent=level_color)}
    {metric("Delta-T", delta_str)}
    {metric("Ambient", ambient_str)}
  </div>

  <div class="grid2">
    <div class="card" style="flex:1.1">
      <div style="font-weight:700;font-size:13px;margin-bottom:8px">Inspection details</div>
      <table>
        {row("Priority", (inspection.priority or '—').title())}
        {row("Reading confidence", conf_str)}
        {row("Asset type", asset.asset_type if asset else '—')}
        {row("Voltage", f"{asset.voltage_kv} kV" if asset and asset.voltage_kv else '—')}
        {row("Region", asset.region if asset and asset.region else '—')}
        {row("GPS", loc_str)}
        {row("Captured", inspection.captured_at.strftime('%d %b %Y') if inspection.captured_at else '—')}
      </table>
    </div>
    <div class="card" style="flex:1">{img}</div>
  </div>

  <div class="card" style="margin-top:18px">
    <div style="font-weight:700;font-size:13px;margin-bottom:12px">Thermographer analysis</div>
    {sections_html}
    {trend_block}
  </div>

  <div class="foot">
    <div class="muted" style="max-width:60%">
      Readings extracted directly from the camera's temperature overlay by a vision model —
      values are never fabricated. This report is confidential to {escape(org.name)}.
    </div>
    <div style="text-align:right">
      <div style="font-weight:700;font-size:12px;color:{primary}">Thermal Eye</div>
      <div class="muted">by Evizen AI</div>
    </div>
  </div>

</div></body></html>"""


async def render_report_pdf(html: str) -> bytes | None:
    """Render HTML to PDF via WeasyPrint. Returns None if native libs are unavailable."""
    try:
        from weasyprint import HTML  # lazy: native libs only needed at call time
    except Exception as exc:  # noqa: BLE001
        logger.warning("weasyprint_unavailable", error=str(exc))
        return None
    try:
        return HTML(string=html).write_pdf()
    except Exception as exc:  # noqa: BLE001
        logger.error("pdf_render_failed", error=str(exc))
        return None
