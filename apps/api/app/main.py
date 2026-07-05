"""ThermalEye API application factory."""

from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.middleware import RequestContextMiddleware
from app.core.ratelimit import RateLimitMiddleware
from app.services import storage

logger = get_logger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    logger.info("startup", env=settings.environment, using_supabase=storage.USING_SUPABASE)

    # Create tables on startup (idempotent — IF NOT EXISTS). Safe for both fresh
    # Supabase installs and restarts against an existing schema.
    from app.core.database import Base, engine
    import app.models  # noqa: F401  (register mappers)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("tables_created")

    if not storage.USING_SUPABASE:
        storage.LOCAL_DIR.mkdir(parents=True, exist_ok=True)

    yield
    logger.info("shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="ThermalEye API",
        version="2.0.0",
        description="Multi-tenant thermal inspection platform.",
        lifespan=lifespan,
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    # Order matters: Starlette runs the LAST-added middleware OUTERMOST. CORS must be
    # outermost so that error responses from inner middleware (e.g. a 429 from the rate
    # limiter) still carry Access-Control-Allow-Origin — otherwise the browser reports a
    # misleading "No 'Access-Control-Allow-Origin' header" / net::ERR_FAILED instead of 429.
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
        max_age=3600,
    )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        # Pydantic v2's exc.errors() embeds the original exception (e.g. a ValueError
        # from a custom validator) under "ctx", which is NOT JSON-serializable and would
        # crash json.dumps here — turning a clean 422 into a 500 with no CORS headers.
        # Keep only the serializable fields the client needs.
        detail = [
            {"type": e.get("type"), "loc": list(e.get("loc", ())), "msg": e.get("msg")}
            for e in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": detail})

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception):
        trace_id = str(uuid.uuid4())
        logger.error(
            "unhandled_exception",
            trace_id=trace_id,
            error_type=type(exc).__name__,
            error=str(exc),
            path=request.url.path,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "trace_id": trace_id},
        )

    app.include_router(api_router, prefix=settings.api_v1_prefix)

    # In dev, serve stored files locally (prod uses Supabase signed URLs).
    if not storage.USING_SUPABASE:
        storage.LOCAL_DIR.mkdir(parents=True, exist_ok=True)
        app.mount("/files", StaticFiles(directory=str(storage.LOCAL_DIR)), name="files")

    @app.get("/", tags=["health"])
    async def root() -> dict:
        return {"service": "ThermalEye API", "version": "2.0.0", "docs": "/docs"}

    return app


app = create_app()
