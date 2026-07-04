"""Lightweight per-IP rate limiting for sensitive endpoints.

In-memory sliding window — good enough for a single instance / brute-force defense.
For multi-instance production, back this with Redis (swap `_hits` for a Redis ZSET).
"""

from __future__ import annotations

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

# path prefix -> (max_requests, window_seconds)
LIMITS: dict[str, tuple[int, int]] = {
    "/api/v1/auth/login": (10, 60),
    "/api/v1/auth/register": (5, 60),
    "/api/v1/auth/forgot-password": (5, 60),
    "/api/v1/auth/reset-password": (10, 60),
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _limit_for(self, path: str) -> tuple[int, int] | None:
        for prefix, cfg in LIMITS.items():
            if path.startswith(prefix):
                return cfg
        return None

    async def dispatch(self, request: Request, call_next):
        cfg = self._limit_for(request.url.path)
        if cfg is None:
            return await call_next(request)

        max_req, window = cfg
        ip = request.client.host if request.client else "unknown"
        key = f"{ip}:{request.url.path}"
        now = time.monotonic()
        bucket = self._hits[key]
        while bucket and bucket[0] <= now - window:
            bucket.popleft()
        if len(bucket) >= max_req:
            retry = int(window - (now - bucket[0])) + 1
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(retry)},
            )
        bucket.append(now)
        return await call_next(request)
