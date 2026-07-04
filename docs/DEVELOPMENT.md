# Local development

Monorepo: `apps/api` (FastAPI) + `apps/web` (Next.js).

## API (`apps/api`)

```bash
cd apps/api
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env          # fill OPENROUTER_API_KEY etc.

# Quick start with SQLite (no Postgres needed):
DATABASE_URL="sqlite+aiosqlite:///./dev.db" AUTO_CREATE_TABLES=1 \
  uvicorn app.main:app --reload --port 8000

# End-to-end smoke test (SQLite, no external services):
python scripts/smoke.py
```

API docs at http://localhost:8000/docs

## Web (`apps/web`)

```bash
cd apps/web
npm install
cp .env.example .env.local     # NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
npm run dev
```

App at http://localhost:3000 → register → upload thermal images.

## Notes
- Set a real `OPENROUTER_API_KEY` to get actual temperature readings; without it,
  uploads complete but each inspection is honestly marked `failed` (never faked).
- With SMTP unset, alert emails are logged instead of sent.
- Files are stored under `apps/api/var/storage/` locally; Supabase Storage in prod.
