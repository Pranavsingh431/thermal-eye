# Supabase project — thermaleye (provisioned)

| Field | Value |
|-------|-------|
| Project ref | `kwdiakxfrptlyyzbtxkr` |
| Project URL | `https://kwdiakxfrptlyyzbtxkr.supabase.co` |
| Region | `ap-south-1` |
| Storage bucket | `thermaleye` (private, 15 MB/file) |
| Schema | 11 tables, RLS enabled + forced, anon/authenticated revoked |
| anon key (public-safe, unused by our app) | `sb_publishable_7XgFYMX_buVryCvdwTE3WA_gUWjIzDg` |

The schema and hardening are **already applied** — you do NOT need to run `init_db`.

## Two secrets to grab from the dashboard (never commit these)

1. **Database password** — Settings → Database → *Reset database password* (copy it).
2. **service_role key** — Settings → API → *Project API keys* → `service_role` (secret).

## Env values for Render (backend)

Build the two DB URLs with the password from step 1. Recommended: **Session pooler**
(Settings → Database → Connection string → *Session pooler* → URI), then swap the scheme:

```
DATABASE_URL       = postgresql+asyncpg://postgres.kwdiakxfrptlyyzbtxkr:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
DATABASE_URL_SYNC  = postgresql+psycopg://postgres.kwdiakxfrptlyyzbtxkr:<DB_PASSWORD>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
SUPABASE_URL       = https://kwdiakxfrptlyyzbtxkr.supabase.co
SUPABASE_SERVICE_ROLE_KEY = <service_role key from step 2>
SUPABASE_STORAGE_BUCKET   = thermaleye
```

(Tip: copy the exact host/port from the dashboard URI — just replace `postgresql://`
with `postgresql+asyncpg://` and `postgresql+psycopg://` respectively.)
