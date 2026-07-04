# ThermalEye

Multi-tenant, AI-powered **thermal inspection platform** for critical infrastructure
(power grids, solar, industrial). Companies sign up, upload their own grid, upload thermal
imagery, and get **AI hotspot analysis → alerts → professional reports** — fully white-labeled
and isolated per tenant.

> Rebuilt from the ground up: modular async FastAPI + Next.js, vision-LLM temperature reading
> (no fabricated data), true multi-tenancy with per-tenant isolation, and platform-managed secrets.

## Monorepo layout

```
apps/
  api/   FastAPI backend (async, Pydantic v2, SQLAlchemy 2)  → Render
  web/   Next.js 14 + TypeScript + Tailwind                   → Vercel
infra/   render.yaml, Supabase schema/hardening, deploy runbook
docs/    architecture, development & deployment guides
```

## Highlights

- **Vision-LLM analysis** via OpenRouter — reads the thermal camera's temperature overlay.
  If a reading isn't legible it fails honestly; it **never invents a temperature**.
- **True multi-tenancy** — every row scoped by `org_id`; app-layer isolation + Postgres RLS.
- **White-label** — per-org branding, thresholds, alert recipients, and custom grid
  (KML / GeoJSON / CSV) upload.
- **Security** — Argon2 + rotating JWT refresh, RBAC, rate limiting, audit logs, signed URLs,
  secrets only in platform managers.

## Quick start

- Local dev: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Deploy (Supabase + Render + Vercel): [infra/DEPLOY.md](infra/DEPLOY.md)

## Stack

| Layer    | Tech                                            | Host     |
|----------|-------------------------------------------------|----------|
| Frontend | Next.js 14, TypeScript, Tailwind                | Vercel   |
| Backend  | FastAPI (async), Pydantic v2, SQLAlchemy 2      | Render   |
| Database | Postgres 17                                     | Supabase |
| Storage  | Private buckets + signed URLs                   | Supabase |
| AI       | OpenRouter (vision + text models)               | —        |
