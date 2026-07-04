"""Live validation of the vision pipeline against a real FLIR image.

Uses the OPENROUTER_API_KEY from apps/api/.env. Run from apps/api:
    python scripts/vision_test.py ../../tests/real_images/FLIR0810.jpg
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import settings  # noqa: E402
from app.models.organization import DEFAULT_SETTINGS  # noqa: E402
from app.services.analysis import analyze_thermal_image  # noqa: E402


async def main() -> None:
    path = Path(sys.argv[1] if len(sys.argv) > 1 else "../../tests/real_images/FLIR0810.jpg")
    data = path.read_bytes()
    print(f"Image: {path.name} ({len(data) // 1024} KB)")
    print(f"Vision model: {settings.openrouter_vision_model}")
    print(f"Key present: {bool(settings.openrouter_api_key)}\n")

    result = await analyze_thermal_image(
        data, "image/jpeg", thresholds=DEFAULT_SETTINGS["thresholds"]
    )
    print("── Result ─────────────────────────────")
    print(f"status         : {result.status}")
    print(f"measured_temp  : {result.measured_temp} °C")
    print(f"ambient_temp   : {result.ambient_temp} °C")
    print(f"delta_t        : {result.delta_t} °C")
    print(f"fault_level    : {result.fault_level}")
    print(f"priority       : {result.priority}")
    print(f"confidence     : {result.confidence}")
    print(f"failure_reason : {result.failure_reason}")
    print(f"raw            : {result.raw}")


if __name__ == "__main__":
    asyncio.run(main())
