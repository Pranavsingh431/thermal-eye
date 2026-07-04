-- ThermalEye — Supabase hardening.
-- Architecture: the FastAPI backend is the ONLY client of the database and connects with
-- the service_role (which bypasses RLS). The browser NEVER talks to Supabase directly.
-- Therefore the main risk is Supabase's auto-generated PostgREST API being reachable with
-- the anon/authenticated keys. We shut that door completely: enable RLS on every table and
-- grant NO policies to anon/authenticated, and revoke their table privileges.
--
-- Run this AFTER `python -m app.scripts.init_db` has created the tables.

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('alter table public.%I force row level security;', t);
    execute format('revoke all on public.%I from anon, authenticated;', t);
  end loop;
end $$;

-- (No permissive policies are created for anon/authenticated, so PostgREST returns nothing
--  for those roles. The backend's service_role bypasses RLS and works normally.)
