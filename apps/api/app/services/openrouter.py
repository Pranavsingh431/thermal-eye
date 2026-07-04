"""Thin async OpenRouter client for vision + text completions."""

from __future__ import annotations

import base64
import json
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("openrouter")


class OpenRouterError(RuntimeError):
    pass


def _headers() -> dict[str, str]:
    if not settings.openrouter_api_key:
        raise OpenRouterError("OPENROUTER_API_KEY is not configured")
    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "HTTP-Referer": settings.openrouter_app_url,
        "X-Title": settings.openrouter_app_title,
        "Content-Type": "application/json",
    }


def image_data_url(image_bytes: bytes, content_type: str = "image/jpeg") -> str:
    b64 = base64.b64encode(image_bytes).decode()
    return f"data:{content_type};base64,{b64}"


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
)
async def _post(payload: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(
            f"{settings.openrouter_base_url}/chat/completions",
            headers=_headers(),
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


def _content_text(response: dict[str, Any]) -> str:
    try:
        return response["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError) as exc:
        raise OpenRouterError(f"Unexpected OpenRouter response shape: {exc}") from exc


def _parse_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1] if "```" in text[3:] else text.strip("`")
        text = text.removeprefix("json").strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise OpenRouterError(f"No JSON object in model output: {text[:200]}")
    return json.loads(text[start : end + 1])


async def vision_json(
    prompt: str, image_bytes: bytes, content_type: str = "image/jpeg", *, model: str | None = None
) -> dict[str, Any]:
    """Ask the vision model for a strict JSON object about an image."""
    payload = {
        "model": model or settings.openrouter_vision_model,
        "temperature": 0,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": image_data_url(image_bytes, content_type)},
                    },
                ],
            }
        ],
    }
    response = await _post(payload)
    return _parse_json(_content_text(response))


async def text_completion(
    system: str, user: str, *, model: str | None = None, max_tokens: int = 1200
) -> str:
    payload = {
        "model": model or settings.openrouter_text_model,
        "temperature": 0.4,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    response = await _post(payload)
    return _content_text(response).strip()
