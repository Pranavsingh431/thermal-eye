"""Password hashing (Argon2) and JWT access/refresh token helpers."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import JWTError, jwt

from app.core.config import settings

_ph = PasswordHasher()

TokenType = Literal["access", "refresh"]


# --- Passwords ---------------------------------------------------------------
def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False
    except Exception:
        return False


def needs_rehash(password_hash: str) -> bool:
    try:
        return _ph.check_needs_rehash(password_hash)
    except Exception:
        return False


# --- JWTs --------------------------------------------------------------------
def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_token(
    subject: str,
    token_type: TokenType,
    *,
    org_id: str | None = None,
    role: str | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    if token_type == "access":
        expire = _now() + timedelta(minutes=settings.access_token_expire_minutes)
    else:
        expire = _now() + timedelta(days=settings.refresh_token_expire_days)

    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(_now().timestamp()),
        "exp": int(expire.timestamp()),
        "jti": str(uuid.uuid4()),
    }
    if org_id is not None:
        payload["org"] = org_id
    if role is not None:
        payload["role"] = role
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None


# --- Opaque tokens (password reset, email verify, refresh at rest) -----------
def generate_opaque_token() -> str:
    return secrets.token_urlsafe(48)


def hash_opaque_token(token: str) -> str:
    """SHA-256 for fast, deterministic lookup of long random tokens stored at rest."""
    return hashlib.sha256(token.encode()).hexdigest()
