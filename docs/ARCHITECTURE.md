# ThermalEye — Architecture (v2 rebuild)

A multi-tenant SaaS for thermal inspection of infrastructure (power grids, solar, industrial).
White-label: any company can sign up, upload their own grid/map, configure branding &
thresholds, upload thermal imagery, get AI analysis + alerts + reports — fully isolated
from every other tenant.

## Stack

| Layer     | Choice                                                        | Host     |
|-----------|---------------------------------------------------------------|----------|
| Frontend  | Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui    | Vercel   |
| Backend   | FastAPI (async) + Pydantic v2 + SQLAlchemy 2.0 + Alembic       | Render   |
| Database  | Postgres 17 (Supabase)                                         | Supabase |
| Storage   | Supabase Storage (private buckets, signed URLs)               | Supabase |
| AI        | OpenRouter — vision model for temp extraction, text for reports| —        |
| Email     | SMTP / Resend for alerts + transactional                       | —        |

Deliberately dropped from the old app: `torch`, `easyocr`, `opencv`, `playwright` — the
multi-GB, slow-cold-start ML stack. Temperature is read by a vision LLM instead. This makes
the image small, cheap to run, and fast to scale.

## Multi-tenancy

- **Organization** = tenant. Every domain row carries `org_id`.
- **Membership** joins users↔orgs with a role (`owner`/`admin`/`inspector`/`viewer`).
- Isolation is enforced at **two** layers:
  1. **Application layer (primary):** every request resolves an active org from the JWT;
     all queries go through org-scoped helpers that inject `WHERE org_id = :org`.
  2. **Postgres RLS (defense-in-depth):** policies key off a per-transaction
     `SET LOCAL app.current_org`, so even a missed filter can't cross tenants.

## Data model (core)

- `organizations` — tenant, branding, settings (thresholds, alert recipients, map center, units, tz)
- `users` — global identity (email unique), argon2 password hash, email_verified
- `memberships` — (user, org, role)
- `assets` — the customer's grid: towers/lines/substations/equipment (lat/lon or GeoJSON),
  voltage, capacity, commissioning year, arbitrary metadata. Uploaded via KML/GeoJSON/CSV.
- `inspections` — one per thermal image: measured/ambient temp, delta, threshold, fault level,
  GPS, matched asset, analysis JSON, AI summary, report path. **Never fabricates a reading** —
  on failure it is marked `failed` with a reason.
- `batches` — an upload session grouping inspections + a combined report
- `alerts` — every alert dispatched (recipients, level, status)
- `audit_logs` — security-relevant actions
- `refresh_tokens`, `password_reset_tokens`, `email_verification_tokens` — auth

## Security

- Argon2 password hashing; JWT access (short) + refresh (rotating, hashed at rest).
- RBAC per membership role. CORS locked to known origins. Security headers.
- Rate limiting (auth + upload endpoints). Audit logging. Signed, expiring URLs for all assets.
- All secrets in platform secret managers (Render/Vercel/Supabase) — never in the repo.

## Repo layout

```
apps/
  api/   FastAPI backend  (Render root dir)
  web/   Next.js frontend (Vercel root dir)
infra/   render.yaml, supabase migrations/policies, deploy notes
docs/    architecture & runbooks
```

The old code lives at the repo root (`backend/`, `frontend/`, loose scripts) and is being
retired; it will be removed once the new stack is verified end-to-end.
