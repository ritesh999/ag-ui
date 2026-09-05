-- DEV/TEST ONLY — do not run against a real Supabase project (it already
-- has a real `auth` schema; this would conflict with it).
--
-- Minimal stand-in for what Supabase provisions on every project: an
-- `auth` schema with a `users` table and a `uid()` function, just enough
-- for the 0001-0009 migrations to apply cleanly against a plain local
-- Postgres and for the RLS tests in ../tests/ to run.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

-- Real Supabase's auth.uid() reads a JWT claim set by PostgREST for the
-- current request. Locally, tests impersonate a user by setting the same
-- GUC directly: `select set_config('request.jwt.claim.sub', '<uuid>', false);`
create or replace function auth.uid() returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
