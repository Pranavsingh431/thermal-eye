"""Emit Postgres DDL for the whole schema (for Supabase apply_migration)."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.dialects import postgresql  # noqa: E402
from sqlalchemy.schema import CreateIndex, CreateTable  # noqa: E402

import app.models  # noqa: E402,F401
from app.core.database import Base  # noqa: E402

dialect = postgresql.dialect()
lines: list[str] = []
for table in Base.metadata.sorted_tables:
    lines.append(str(CreateTable(table).compile(dialect=dialect)).strip() + ";")
    for index in table.indexes:
        lines.append(str(CreateIndex(index).compile(dialect=dialect)).strip() + ";")

print("\n\n".join(lines))
