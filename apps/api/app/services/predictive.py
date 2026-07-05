"""Predictive maintenance ("Insulator Health").

Turns an asset's *real* thermal inspection history into a forecast: fit a trend
to the temperature rise over time, project when it will cross the organization's
critical threshold, and rank the fleet by which asset fails next.

Design principle (same as analysis): we never invent data. A forecast is only
produced when there is enough real history; otherwise the asset is honestly
marked ``insufficient_data``.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

from app.models.asset import Asset
from app.models.inspection import Inspection
from app.schemas.asset import AssetHealth, AssetHealthPoint

DAYS_PER_MONTH = 30.44
MIN_POINTS = 3  # need at least 3 real inspections to fit a trend
WORSENING_EPS = 0.4  # °C/month slope beyond which we call a trend "worsening"/"improving"
FORECAST_HORIZON_MONTHS = 120.0  # don't project failures more than ~10 years out

_RISK_RANK = {"CRITICAL": 0, "WARNING": 1, "NORMAL": 2, "UNKNOWN": 3}


def risk_rank(risk: str) -> int:
    return _RISK_RANK.get(risk, 3)


def _ts(insp: Inspection) -> datetime:
    dt = insp.captured_at or insp.created_at
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _linreg(xs: list[float], ys: list[float]) -> tuple[float, float, float] | None:
    """Ordinary least squares. Returns (slope, intercept, r_squared) or None."""
    n = len(xs)
    if n < 2:
        return None
    mx = sum(xs) / n
    my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if sxx == 0:  # all inspections at the same instant — no time spread
        return None
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    slope = sxy / sxx
    intercept = my - slope * mx
    syy = sum((y - my) ** 2 for y in ys)
    if syy == 0:
        r2 = 1.0
    else:
        ss_res = sum((y - (intercept + slope * x)) ** 2 for x, y in zip(xs, ys))
        r2 = max(0.0, min(1.0, 1 - ss_res / syy))
    return slope, intercept, r2


def compute_asset_health(
    asset: Asset, inspections: list[Inspection], thresholds: dict
) -> AssetHealth:
    critical_delta = float(thresholds.get("critical_delta", 30))
    critical_abs = float(thresholds.get("critical_abs", 80))

    completed = [i for i in inspections if i.measured_temp is not None]
    completed.sort(key=_ts)

    history = [
        AssetHealthPoint(
            captured_at=_ts(i),
            measured_temp=i.measured_temp,
            delta_t=i.delta_t,
            fault_level=i.fault_level,
        )
        for i in completed
    ]

    base = dict(
        asset_id=asset.id,
        asset_name=asset.name,
        external_id=asset.external_id,
        asset_type=asset.asset_type,
        region=asset.region,
        latitude=asset.latitude,
        longitude=asset.longitude,
        voltage_kv=asset.voltage_kv,
        inspection_count=len(completed),
        first_seen=_ts(completed[0]) if completed else None,
        last_seen=_ts(completed[-1]) if completed else None,
        latest_delta_t=completed[-1].delta_t if completed else None,
        latest_fault_level=completed[-1].fault_level if completed else None,
        history=history,
    )

    if not completed:
        return AssetHealth(
            **base,
            trend="insufficient_data",
            slope_c_per_month=None,
            r_squared=None,
            health_score=100.0,
            risk_level="UNKNOWN",
            predicted_cross_date=None,
            months_to_critical=None,
            recommendation="No inspections recorded yet for this asset.",
        )

    # Prefer ΔT (normalized for ambient, matches thresholds); fall back to absolute.
    use_delta = sum(1 for i in completed if i.delta_t is not None) >= max(
        MIN_POINTS, math.ceil(0.6 * len(completed))
    )
    if use_delta:
        pts = [(i, i.delta_t) for i in completed if i.delta_t is not None]
        threshold = critical_delta
        metric_label = "ΔT"
    else:
        pts = [(i, i.measured_temp) for i in completed]
        threshold = critical_abs
        metric_label = "temperature"

    t0 = _ts(pts[0][0])
    xs = [(_ts(i) - t0).total_seconds() / (DAYS_PER_MONTH * 86400) for i, _ in pts]
    ys = [float(v) for _, v in pts]
    latest_value = ys[-1]
    latest_level = completed[-1].fault_level

    reg = _linreg(xs, ys) if len(pts) >= MIN_POINTS else None

    if reg is None:
        # Not enough real history to forecast — grade honestly on the latest reading.
        score = {"CRITICAL": 22.0, "WARNING": 55.0, "NORMAL": 82.0}.get(latest_level or "", 90.0)
        risk = latest_level if latest_level in ("CRITICAL", "WARNING") else "UNKNOWN"
        return AssetHealth(
            **base,
            trend="insufficient_data",
            slope_c_per_month=None,
            r_squared=None,
            health_score=round(score, 1),
            risk_level=risk if risk in ("CRITICAL", "WARNING", "NORMAL") else "UNKNOWN",
            predicted_cross_date=None,
            months_to_critical=None,
            recommendation=(
                f"Only {len(completed)} inspection(s) on record — keep inspecting to unlock a "
                f"failure forecast. Latest reading is {latest_level or 'unclassified'}."
            ),
        )

    slope, intercept, r2 = reg
    x_last = xs[-1]

    if slope >= WORSENING_EPS:
        trend = "worsening"
    elif slope <= -WORSENING_EPS:
        trend = "improving"
    else:
        trend = "stable"

    # ── Forecast the crossing of the critical threshold ──
    months_to_critical: float | None = None
    predicted_cross_date: datetime | None = None
    last_ts = _ts(pts[-1][0])

    if latest_value >= threshold:
        months_to_critical = 0.0
        predicted_cross_date = datetime.now(timezone.utc)
    elif slope > 0:
        x_cross = (threshold - intercept) / slope
        delta_months = x_cross - x_last
        if 0 <= delta_months <= FORECAST_HORIZON_MONTHS:
            months_to_critical = round(delta_months, 1)
            predicted_cross_date = last_ts + _months(delta_months)

    # ── Health score (0..100, higher = healthier) ──
    proximity = min(latest_value / threshold, 1.2) if threshold > 0 else 0.0
    score = 100.0 - proximity * 48.0  # closeness to critical (up to -58)
    if months_to_critical is not None:
        # sooner failure => steeper penalty (full penalty at <=0 months, none at >=18)
        urgency = max(0.0, (18.0 - months_to_critical) / 18.0)
        score -= urgency * 42.0
    elif trend == "improving":
        score += 6.0
    score = round(max(0.0, min(100.0, score)), 1)

    # ── Risk level ──
    if latest_value >= threshold or (months_to_critical is not None and months_to_critical <= 1):
        risk = "CRITICAL"
    elif (months_to_critical is not None and months_to_critical <= 6) or latest_level == "WARNING":
        risk = "WARNING"
    else:
        risk = "NORMAL"

    recommendation = _recommend(
        asset.name, trend, slope, metric_label, months_to_critical, predicted_cross_date, risk, r2
    )

    return AssetHealth(
        **base,
        trend=trend,
        slope_c_per_month=round(slope, 2),
        r_squared=round(r2, 2),
        health_score=score,
        risk_level=risk,
        predicted_cross_date=predicted_cross_date,
        months_to_critical=months_to_critical,
        recommendation=recommendation,
    )


def _months(m: float):
    from datetime import timedelta

    return timedelta(days=m * DAYS_PER_MONTH)


def _recommend(
    name: str,
    trend: str,
    slope: float,
    metric: str,
    months: float | None,
    cross_date: datetime | None,
    risk: str,
    r2: float,
) -> str:
    if risk == "CRITICAL" and (months is not None and months <= 1):
        return (
            f"Immediate action: {name} is at or past its critical threshold. Dispatch a crew to "
            "inspect and remediate before the next load peak."
        )
    if trend == "worsening" and months is not None and cross_date is not None:
        conf = "high" if r2 >= 0.7 else "moderate" if r2 >= 0.4 else "low"
        when = cross_date.strftime("%b %Y")
        wk = max(1, math.ceil(months * 4.345))
        return (
            f"{metric} rising ~{slope:.1f}°C/month. Projected to cross critical around {when} "
            f"(~{months:.0f} month{'s' if months >= 2 else ''}, {conf} confidence). "
            f"Schedule an inspection within {wk} week(s)."
        )
    if trend == "improving":
        return f"{metric} trending down ({slope:.1f}°C/month) — a prior fix appears to be holding. Routine monitoring."
    if trend == "stable":
        return f"{metric} stable and within limits. Continue routine monitoring."
    return "Continue routine monitoring."
