"""Create all tables against the configured database.

Greenfield bootstrap for the first deploy (run once against Supabase Postgres):

    python -m app.scripts.init_db

For subsequent schema changes, use Alembic migrations.
"""

from __future__ import annotations

import asyncio

import app.models  # noqa: F401  — register all mappers
from app.core.database import Base, engine
from app.core.logging import configure_logging, get_logger


async def main() -> None:
    configure_logging()
    logger = get_logger("init_db")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("schema_created", tables=len(Base.metadata.tables))
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
