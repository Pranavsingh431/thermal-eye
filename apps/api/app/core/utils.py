"""Small shared helpers."""

from __future__ import annotations

import re
import secrets

_slug_re = re.compile(r"[^a-z0-9]+")


def slugify(text: str) -> str:
    base = _slug_re.sub("-", text.lower()).strip("-")
    return base or "org"


def unique_slug(text: str) -> str:
    """Slug with a short random suffix to avoid collisions across tenants."""
    return f"{slugify(text)[:60]}-{secrets.token_hex(3)}"
