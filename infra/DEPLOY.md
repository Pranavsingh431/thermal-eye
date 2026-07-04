# ThermalEye — Deployment Runbook

Three managed services: **Supabase** (Postgres + Storage), **Render** (API), **Vercel** (web).

---

## 1. Supabase (database + storage)

1. Create a project (region close to users, e.g. `ap-south-1`). Save the DB password.
2. **Connection strings** — Project → Settings → Database → Connection string:
   - Async (app): `postgresql+asyncpg://postgres.<ref>:<PW>@<host>:5432/postgres`
   - Sync (migrations): `postgresql+psycopg://postgres.<ref>:<PW>@<host>:5432/postgres`
   - Prefer the **Session pooler** host for a long-lived service like Render.
3. **Storage** — Storage → Create a **private** bucket named `thermaleye`.
4. **Keys** — Settings → API: copy the **Project URL** and the **service_role** key
   (server-only; never ship to the browser).
5. Create the schema (from `apps/api`, with env pointing at the Supabase DB):
   ```bash
   python -m app.scripts.init_db
   ```
6. Harden the auto API:
   ```bash
   psql "<sync connection string>" -f infra/supabase/hardening.sql
   ```

## 2. Render (API)

Option A — Blueprint: New + → **Blueprint**, point at this repo (`infra/render.yaml`).
Option B — Manual: New + → **Web Service** → Docker, **root dir `apps/api`**.

Set env vars (Render dashboard → Environment):

| Key | Value |
|-----|-------|
| `ENVIRONMENT` | `production` |
| `SECRET_KEY` | 64-byte random (`python -c "import secrets;print(secrets.token_urlsafe(64))"`) |
| `DATABASE_URL` | Supabase **asyncpg** URL |
| `DATABASE_URL_SYNC` | Supabase **psycopg** URL |
| `CORS_ORIGINS` | your Vercel URL, e.g. `https://thermaleye.vercel.app` |
| `OPENROUTER_API_KEY` | your funded key |
| `OPENROUTER_VISION_MODEL` | `google/gemini-2.5-flash` |
| `OPENROUTER_TEXT_MODEL` | `anthropic/claude-sonnet-4` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `SUPABASE_STORAGE_BUCKET` | `thermaleye` |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM` | your SMTP (Gmail app password, Resend, etc.) |
| `DEFAULT_ALERT_RECIPIENT` | `singhpranav431@gmail.com` |

Health check path: `/healthz`.

## 3. Vercel (web)

1. New Project → import this repo → **Root Directory: `apps/web`** (framework auto-detected: Next.js).
2. Env var: `NEXT_PUBLIC_API_BASE_URL = https://<your-render-service>.onrender.com`
3. Deploy. Then set that Vercel URL as `CORS_ORIGINS` on Render and redeploy the API.

## 4. Post-deploy smoke

```bash
curl https://<render>.onrender.com/healthz          # {"status":"ok"}
# then register at https://<vercel-app>/register and upload a thermal image.
```

## Rotate the leaked keys first
The old `production.env` was committed to git history. Before go-live, rotate:
OpenRouter key, Gmail/SMTP app password, weather key, and generate a fresh `SECRET_KEY`.
