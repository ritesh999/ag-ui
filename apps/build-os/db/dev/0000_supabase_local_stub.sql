-- DEV/TEST ONLY — do not run against a real Supabase project (it already
-- has a real `auth` schema; this would conflict with it).
--
-- Minimal stand-in for what Supabase provisions on every project: an
-- `auth` schema with a `users` table and a `uid()` function, just enough
-- for the 0001-0009 migrations to apply cleanly against a plain local
-- Postgres and for the RLS tests in ../tests/ to run.

-- Supabase provisions these roles on every project (anon/authenticated
-- are what PostgREST assumes when granting access to RPC functions etc).
-- service_role is included for completeness though nothing here uses it.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

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

-- Real Supabase grants USAGE on schema auth and EXECUTE on auth.uid() to
-- anon/authenticated (and public) by default — RLS policies that call
-- auth.uid() (or app.current_user_id(), which just wraps it) directly,
-- rather than through a SECURITY DEFINER function, rely on this. Missing
-- from this stub until the audit_log RLS test caught it: every earlier
-- test's direct-policy paths (audit_log_insert, the `users` self-select)
-- happened to run before `set role app_user`, as the (bypassrls) owner,
-- so the gap went unnoticed.
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role, public;

-- Minimal stand-in for Supabase Storage (used by 0011_storage.sql):
-- just enough of storage.buckets/storage.objects/storage.foldername to
-- exercise the RLS policies. Not a real implementation of Storage's
-- upload/download HTTP API — there's nothing here to actually put bytes
-- in, only the Postgres-level access-control surface that 0011's
-- policies govern.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz not null default now(),
  metadata jsonb
);

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select (string_to_array(name, '/'))[1 : array_length(string_to_array(name, '/'), 1) - 1];
$$;
