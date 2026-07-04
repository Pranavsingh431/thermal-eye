"""Async database engine, session factory, and declarative base."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def _engine_kwargs() -> dict:
    kwargs: dict = {"echo": settings.db_echo, "pool_pre_ping": True}
    # Supabase's transaction pooler (pgbouncer) doesn't support prepared statements;
    # disable asyncpg statement caching so the app works behind the pooler.
    if "asyncpg" in settings.database_url:
        kwargs["connect_args"] = {"statement_cache_size": 0}
    return kwargs


engine = create_async_engine(settings.database_url, **_engine_kwargs())

SessionFactory = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding a database session."""
    async with SessionFactory() as session:
        try:
            yield session
        finally:
            await session.close()
