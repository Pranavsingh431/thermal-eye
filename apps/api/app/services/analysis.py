"""Thermal image analysis: vision-LLM temperature extraction + classification.

Design principle: **never fabricate a reading**. If the model can't legibly read a
temperature, the inspection is marked ``failed`` with a reason — it is never filled
with a random number (unlike the legacy system).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.core.enums import AnalysisStatus, FaultLevel, Priority
from app.core.logging import get_logger
from app.services.openrouter import OpenRouterError, vision_json

logger = get_logger("analysis")

VISION_PROMPT = (
    "You are a thermographic inspection assistant analyzing an infrared (thermal) image of "
    "electrical or industrial infrastructure (e.g. power line towers, insulators, transformers, "
    "busbars, solar panels).\n\n"
    "Read ONLY the temperature values actually printed on the image as overlays — spot markers, "
    "crosshairs, and Max/Min/Center labels produced by the thermal camera (FLIR-style).\n\n"
    "Return a STRICT JSON object with exactly these keys:\n"
    '  "is_thermal_image": boolean,\n'
    '  "readable": boolean,            // true only if a numeric temperature overlay is legible\n'
    '  "max_temp": number|null,        // highest temperature reading visible\n'
    '  "spot_temp": number|null,       // center/primary spot reading if present\n'
    '  "min_temp": number|null,\n'
    '  "ambient_temp": number|null,    // only if the image explicitly shows it\n'
    '  "unit": "C"|"F"|null,\n'
    '  "hotspot_description": string,  // brief, e.g. "hotspot at conductor clamp"\n'
    '  "confidence": number            // 0..1, your confidence in the readings\n\n'
    "Rules: Do NOT estimate, guess, or invent temperatures. If no numeric overlay is legible, "
    'set "readable": false and all temperatures null. Respond with JSON only.'
)


@dataclass
class AnalysisResult:
    status: str
    measured_temp: float | None = None
    ambient_temp: float | None = None
    delta_t: float | None = None
    threshold_used: float | None = None
    fault_level: str | None = None
    priority: str | None = None
    confidence: float | None = None
    raw: dict[str, Any] = field(default_factory=dict)
    failure_reason: str | None = None


def _to_celsius(value: float | None, unit: str | None) -> float | None:
    if value is None:
        return None
    if unit and unit.upper() == "F":
        return round((value - 32) * 5 / 9, 1)
    return round(value, 1)


def classify(
    measured_temp: float,
    ambient_temp: float | None,
    thresholds: dict[str, Any],
) -> tuple[str, str, float | None, float]:
    """Return (fault_level, priority, delta_t, threshold_used)."""
    warning_delta = float(thresholds.get("warning_delta", 15))
    critical_delta = float(thresholds.get("critical_delta", 30))
    warning_abs = float(thresholds.get("warning_abs", 60))
    critical_abs = float(thresholds.get("critical_abs", 80))

    delta_t = round(measured_temp - ambient_temp, 1) if ambient_temp is not None else None

    level = FaultLevel.NORMAL
    if delta_t is not None:
        if delta_t >= critical_delta:
            level = FaultLevel.CRITICAL
        elif delta_t >= warning_delta:
            level = FaultLevel.WARNING
    # Absolute-temperature guardrail can only escalate.
    if measured_temp >= critical_abs:
        level = FaultLevel.CRITICAL
    elif measured_temp >= warning_abs and level == FaultLevel.NORMAL:
        level = FaultLevel.WARNING

    priority = {
        FaultLevel.CRITICAL: Priority.CRITICAL,
        FaultLevel.WARNING: Priority.MEDIUM,
        FaultLevel.NORMAL: Priority.LOW,
    }[level]
    return level.value, priority.value, delta_t, warning_delta


async def analyze_thermal_image(
    image_bytes: bytes,
    content_type: str,
    *,
    thresholds: dict[str, Any],
    ambient_temp: float | None = None,
    min_confidence: float = 0.35,
) -> AnalysisResult:
    try:
        raw = await vision_json(VISION_PROMPT, image_bytes, content_type)
    except OpenRouterError as exc:
        logger.warning("vision_unavailable", error=str(exc))
        return AnalysisResult(
            status=AnalysisStatus.FAILED.value,
            failure_reason=f"Vision model unavailable: {exc}",
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("vision_error", error=str(exc))
        return AnalysisResult(
            status=AnalysisStatus.FAILED.value,
            failure_reason=f"Analysis error: {exc}",
        )

    unit = raw.get("unit")
    confidence = raw.get("confidence")
    confidence = float(confidence) if isinstance(confidence, (int, float)) else None

    if not raw.get("readable") or (confidence is not None and confidence < min_confidence):
        return AnalysisResult(
            status=AnalysisStatus.FAILED.value,
            confidence=confidence,
            raw=raw,
            failure_reason=(
                "No legible temperature overlay detected. Upload a thermal image whose "
                "camera temperature readout is clearly visible."
            ),
        )

    measured = _to_celsius(raw.get("max_temp") or raw.get("spot_temp"), unit)
    if measured is None:
        return AnalysisResult(
            status=AnalysisStatus.FAILED.value,
            confidence=confidence,
            raw=raw,
            failure_reason="Model reported readable but returned no temperature value.",
        )

    # Prefer an ambient printed on the image; otherwise use the supplied value
    # (e.g. weather-derived from GPS + capture date) so ΔT can still be computed.
    detected_ambient = _to_celsius(raw.get("ambient_temp"), unit)
    effective_ambient = detected_ambient if detected_ambient is not None else ambient_temp

    fault_level, priority, delta_t, threshold_used = classify(
        measured, effective_ambient, thresholds
    )
    return AnalysisResult(
        status=AnalysisStatus.COMPLETED.value,
        measured_temp=measured,
        ambient_temp=effective_ambient,
        delta_t=delta_t,
        threshold_used=threshold_used,
        fault_level=fault_level,
        priority=priority,
        confidence=confidence,
        raw=raw,
    )
