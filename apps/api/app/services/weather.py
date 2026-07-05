"""Ambient-temperature enrichment via Open-Meteo (free, no API key required).

When a thermal frame doesn't carry an ambient overlay, we still need an ambient
value to compute ΔT (rise over ambient). Given the inspection's GPS + capture
date we look up the local air temperature. Results are cached per
(lat, lon, day) so a batch of images from one site/day makes a single call.
"""

from __future__ import annotations

from datetime import datetime, timezone

import httpx

from app.core.logging import get_logger

logger = get_logger("weather")

_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

# Process-lifetime cache: (round(lat,2), round(lon,2), YYYY-MM-DD) -> °C | None
_cache: dict[tuple[float, float, str], float | None] = {}


def _aware(when: datetime | None) -> datetime:
    when = when or datetime.now(timezone.utc)
    return when if when.tzinfo else when.replace(tzinfo=timezone.utc)


async def ambient_for(
    lat: float | None, lon: float | None, when: datetime | None = None
) -> float | None:
    """Return the local air temperature (°C) at a point/time, or None."""
    if lat is None or lon is None:
        return None
    when = _aware(when)
    key = (round(lat, 2), round(lon, 2), when.date().isoformat())
    if key in _cache:
        return _cache[key]
    temp = await _fetch(lat, lon, when)
    _cache[key] = temp
    return temp


async def _fetch(lat: float, lon: float, when: datetime) -> float | None:
    age_days = (datetime.now(timezone.utc).date() - when.date()).days
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if age_days > 5:
                # Archive reanalysis (a few days' lag) — daily mean for that date.
                resp = await client.get(
                    _ARCHIVE_URL,
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "start_date": when.date().isoformat(),
                        "end_date": when.date().isoformat(),
                        "daily": "temperature_2m_mean",
                        "timezone": "UTC",
                    },
                )
                resp.raise_for_status()
                vals = resp.json().get("daily", {}).get("temperature_2m_mean", [])
                v = vals[0] if vals else None
            else:
                # Recent/near-now — hourly series, pick the hour nearest capture.
                past_days = min(max(age_days + 1, 1), 7)
                resp = await client.get(
                    _FORECAST_URL,
                    params={
                        "latitude": lat,
                        "longitude": lon,
                        "hourly": "temperature_2m",
                        "past_days": past_days,
                        "forecast_days": 1,
                        "timezone": "UTC",
                    },
                )
                resp.raise_for_status()
                hourly = resp.json().get("hourly", {})
                times, temps = hourly.get("time", []), hourly.get("temperature_2m", [])
                if not times or not temps:
                    return None
                idx = min(
                    range(len(times)),
                    key=lambda i: abs(
                        datetime.fromisoformat(times[i]).replace(tzinfo=timezone.utc) - when
                    ),
                )
                v = temps[idx]
            return round(float(v), 1) if v is not None else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("weather_fetch_failed", lat=lat, lon=lon, error=str(exc))
        return None
