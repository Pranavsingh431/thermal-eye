"""Report generation: AI narrative + branded HTML, optional PDF via WeasyPrint."""

from __future__ import annotations

from datetime import datetime, timezone
from html import escape

from app.core.logging import get_logger
from app.models.asset import Asset
from app.models.inspection import Inspection
from app.models.organization import Organization
from app.services.openrouter import OpenRouterError, text_completion

logger = get_logger("reports")

_SYSTEM = (
    "You are a senior thermographer writing a concise, professional inspection finding for an "
    "electrical/industrial asset. Be factual and specific. Do not invent measurements beyond "
    "those provided. Output 3 short sections: Assessment, Likely cause, Recommended action."
)


async def generate_ai_summary(
    inspection: Inspection, asset: Asset | None, org: Organization
) -> str:
    facts = (
        f"Organization: {org.name}\n"
        f"Asset: {asset.name if asset else 'unmatched'} "
        f"({asset.asset_type if asset else 'unknown'}, "
        f"{asset.voltage_kv if asset else '?'} kV)\n"
        f"Measured temperature: {inspection.measured_temp} C\n"
        f"Ambient: {inspection.ambient_temp} C\n"
        f"Delta-T: {inspection.delta_t} C\n"
        f"Classification: {inspection.fault_level} (priority {inspection.priority})\n"
        f"Vision notes: {(inspection.analysis_json or {}).get('hotspot_description', '')}\n"
    )
    try:
        return await text_completion(_SYSTEM, facts, max_tokens=450)
    except (OpenRouterError, Exception) as exc:  # noqa: BLE001
        logger.warning("ai_summary_fallback", error=str(exc))
        level = inspection.fault_level or "NORMAL"
        return (
            f"Assessment: Measured {inspection.measured_temp} °C "
            f"(ΔT {inspection.delta_t} °C) — classified {level}.\n"
            "Likely cause: Elevated ΔT can indicate a loose/corroded connection or increased "
            "resistance under load.\n"
            "Recommended action: "
            + (
                "Schedule inspection at next maintenance window."
                if level == "NORMAL"
                else "Prioritize a physical inspection of the hotspot; verify torque/contact."
            )
        )


def render_report_html(
    org: Organization,
    inspection: Inspection,
    asset: Asset | None,
    image_url: str | None,
) -> str:
    primary = org.primary_color or "#2563eb"
    level = inspection.fault_level or "N/A"
    level_color = {"CRITICAL": "#dc2626", "WARNING": "#d97706", "NORMAL": "#16a34a"}.get(
        level, "#6b7280"
    )
    summary_html = escape(inspection.ai_summary or "").replace("\n", "<br>")
    logo = (
        f'<img src="{escape(org.logo_url)}" style="height:40px" alt="logo">'
        if org.logo_url
        else f'<div style="font-size:22px;font-weight:800;color:{primary}">{escape(org.name)}</div>'
    )
    img = (
        f'<img src="{escape(image_url)}" style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb">'
        if image_url
        else '<div style="color:#9ca3af">No image</div>'
    )
    generated = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    def row(label: str, value: str) -> str:
        return (
            f'<tr><td style="color:#6b7280;padding:8px 0;width:180px">{label}</td>'
            f'<td style="font-weight:600">{value}</td></tr>'
        )

    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>
  body {{ font-family:'Helvetica Neue',Arial,sans-serif; color:#111827; margin:0; padding:32px; }}
  .header {{ display:flex; justify-content:space-between; align-items:center;
             border-bottom:3px solid {primary}; padding-bottom:16px; margin-bottom:24px; }}
  .badge {{ background:{level_color}; color:#fff; padding:4px 14px; border-radius:999px;
            font-weight:700; font-size:13px; }}
  h1 {{ font-size:20px; margin:0 0 4px; }}
  table {{ width:100%; border-collapse:collapse; font-size:14px; }}
  .card {{ border:1px solid #e5e7eb; border-radius:10px; padding:18px; margin-bottom:18px; }}
  .muted {{ color:#6b7280; font-size:12px; }}
</style></head><body>
  <div class="header">
    {logo}
    <div style="text-align:right">
      <div class="badge">{level}</div>
      <div class="muted" style="margin-top:6px">Thermal Inspection Report</div>
    </div>
  </div>

  <h1>{escape(asset.name if asset else 'Unmatched location')}</h1>
  <div class="muted">Generated {generated} · Inspection {str(inspection.id)[:8]}</div>

  <div style="display:flex;gap:18px;margin-top:20px">
    <div class="card" style="flex:1">
      <table>
        {row("Measured temperature", f"{inspection.measured_temp} °C")}
        {row("Ambient", f"{inspection.ambient_temp if inspection.ambient_temp is not None else '—'} °C")}
        {row("Delta-T", f"{inspection.delta_t if inspection.delta_t is not None else '—'} °C")}
        {row("Priority", inspection.priority or '—')}
        {row("Asset type", asset.asset_type if asset else '—')}
        {row("Voltage", f"{asset.voltage_kv} kV" if asset and asset.voltage_kv else '—')}
        {row("Location", f"{inspection.latitude:.5f}, {inspection.longitude:.5f}" if inspection.latitude is not None else '—')}
        {row("Confidence", f"{int((inspection.confidence or 0)*100)}%" if inspection.confidence else '—')}
      </table>
    </div>
    <div class="card" style="flex:1">{img}</div>
  </div>

  <div class="card">
    <h3 style="margin-top:0">Analysis</h3>
    <div style="font-size:14px;line-height:1.6">{summary_html}</div>
  </div>

  <div class="muted">Powered by ThermalEye · Readings extracted from camera overlay — never fabricated.</div>
</body></html>"""


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
