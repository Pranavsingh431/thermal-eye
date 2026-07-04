"""Geospatial helpers: EXIF GPS, distance, nearest-asset, and grid import parsers."""

from __future__ import annotations

import csv
import io
import json
import xml.etree.ElementTree as ET
from math import asin, cos, radians, sin, sqrt
from typing import Any

from PIL import Image
from PIL.ExifTags import GPSTAGS

from app.core.enums import AssetType
from app.core.logging import get_logger

logger = get_logger("geo")

_KML_NS = "{http://www.opengis.net/kml/2.2}"


# --- EXIF GPS ----------------------------------------------------------------
def _dms_to_decimal(dms: Any, ref: str) -> float:
    deg, minutes, seconds = (float(x) for x in dms)
    decimal = deg + minutes / 60.0 + seconds / 3600.0
    if ref in ("S", "W"):
        decimal = -decimal
    return round(decimal, 6)


def extract_gps(image_bytes: bytes) -> tuple[float | None, float | None]:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        exif = img.getexif()
        gps_ifd = exif.get_ifd(0x8825)
        if not gps_ifd:
            return None, None
        gps = {GPSTAGS.get(k, k): v for k, v in gps_ifd.items()}
        if all(k in gps for k in ("GPSLatitude", "GPSLatitudeRef", "GPSLongitude", "GPSLongitudeRef")):
            lat = _dms_to_decimal(gps["GPSLatitude"], gps["GPSLatitudeRef"])
            lon = _dms_to_decimal(gps["GPSLongitude"], gps["GPSLongitudeRef"])
            return lat, lon
    except Exception as exc:  # noqa: BLE001
        logger.debug("gps_extract_failed", error=str(exc))
    return None, None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * asin(sqrt(a)) * 6371.0


def nearest_asset(
    assets: list[Any], lat: float, lon: float, max_km: float = 25.0
) -> tuple[Any | None, float | None]:
    best, best_dist = None, float("inf")
    for asset in assets:
        if asset.latitude is None or asset.longitude is None:
            continue
        dist = haversine_km(lat, lon, asset.latitude, asset.longitude)
        if dist < best_dist and dist <= max_km:
            best, best_dist = asset, dist
    return best, (round(best_dist, 3) if best else None)


# --- Grid import parsers -----------------------------------------------------
def _voltage_from_text(text: str) -> float | None:
    import re

    m = re.search(r"(\d+(?:\.\d+)?)\s*kv", text, re.IGNORECASE)
    return float(m.group(1)) if m else None


def parse_geojson(data: bytes) -> list[dict[str, Any]]:
    doc = json.loads(data)
    features = doc.get("features", []) if isinstance(doc, dict) else []
    out: list[dict[str, Any]] = []
    for feat in features:
        geom = feat.get("geometry") or {}
        props = feat.get("properties") or {}
        gtype = geom.get("type")
        coords = geom.get("coordinates")
        name = str(props.get("name") or props.get("Name") or props.get("id") or "Asset")
        item: dict[str, Any] = {
            "name": name,
            "external_id": props.get("id") or props.get("external_id"),
            "voltage_kv": _voltage_from_text(name) or props.get("voltage_kv"),
            "asset_metadata": {k: v for k, v in props.items() if k not in {"name", "Name"}},
        }
        if gtype == "Point" and isinstance(coords, list) and len(coords) >= 2:
            item.update({"asset_type": AssetType.TOWER.value, "longitude": coords[0], "latitude": coords[1]})
        elif gtype in ("LineString", "MultiLineString", "Polygon"):
            item.update({"asset_type": AssetType.LINE.value, "geometry": geom})
        else:
            continue
        out.append(item)
    return out


def parse_kml(data: bytes) -> list[dict[str, Any]]:
    root = ET.fromstring(data)
    out: list[dict[str, Any]] = []
    for pm in root.iter(f"{_KML_NS}Placemark"):
        name_el = pm.find(f"{_KML_NS}name")
        name = name_el.text.strip() if name_el is not None and name_el.text else "Asset"
        point = pm.find(f".//{_KML_NS}Point/{_KML_NS}coordinates")
        line = pm.find(f".//{_KML_NS}LineString/{_KML_NS}coordinates")
        if point is not None and point.text:
            parts = point.text.strip().split(",")
            if len(parts) >= 2:
                out.append({
                    "name": name,
                    "asset_type": AssetType.TOWER.value,
                    "longitude": float(parts[0]),
                    "latitude": float(parts[1]),
                    "voltage_kv": _voltage_from_text(name),
                })
        elif line is not None and line.text:
            pts = []
            for token in line.text.strip().split():
                parts = token.split(",")
                if len(parts) >= 2:
                    pts.append([float(parts[0]), float(parts[1])])
            if pts:
                out.append({
                    "name": name,
                    "asset_type": AssetType.LINE.value,
                    "geometry": {"type": "LineString", "coordinates": pts},
                    "voltage_kv": _voltage_from_text(name),
                })
    return out


def parse_csv(data: bytes) -> list[dict[str, Any]]:
    text = data.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    out: list[dict[str, Any]] = []

    def pick(row: dict, *names: str) -> Any:
        for n in names:
            for key in row:
                if key and key.strip().lower() == n:
                    return row[key]
        return None

    for row in reader:
        lat = pick(row, "latitude", "lat", "y")
        lon = pick(row, "longitude", "lon", "lng", "x")
        name = pick(row, "name", "tower_name", "asset", "id") or "Asset"
        try:
            lat_f = float(lat) if lat not in (None, "") else None
            lon_f = float(lon) if lon not in (None, "") else None
        except ValueError:
            lat_f = lon_f = None
        volt = pick(row, "voltage_kv", "voltage", "kv")
        try:
            volt_f = float(str(volt).lower().replace("kv", "").strip()) if volt else None
        except ValueError:
            volt_f = None
        out.append({
            "name": str(name),
            "external_id": pick(row, "external_id", "id", "tower_id"),
            "asset_type": (pick(row, "asset_type", "type") or AssetType.TOWER.value),
            "latitude": lat_f,
            "longitude": lon_f,
            "voltage_kv": volt_f,
            "region": pick(row, "region", "camp_name", "zone"),
            "asset_metadata": {},
        })
    return out


def parse_grid_file(filename: str, data: bytes) -> list[dict[str, Any]]:
    lower = filename.lower()
    if lower.endswith((".geojson", ".json")):
        return parse_geojson(data)
    if lower.endswith(".kml"):
        return parse_kml(data)
    if lower.endswith(".csv"):
        return parse_csv(data)
    raise ValueError("Unsupported file type. Upload .geojson, .kml, or .csv")
