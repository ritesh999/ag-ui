-- Build OS — 0002: organizations, users, memberships
--
-- Every tenant-scoped table in later migrations carries its own
-- `organization_id` (denormalized rather than reached via joins) so RLS
-- policies stay a single equality/EXISTS check instead of a multi-table
-- join on every row — see 0009_row_level_security.sql.

create table organizations (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  currency_code  char(3) not null default 'USD',   -- ISO 4217; spec 6: configurable per org
  unit_system    text not null default 'metric'
                   check (unit_system in ('metric', 'imperial')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

comment on column organizations.currency_code is
  'Org-wide default; a project may override via projects.currency_code.';
comment on column organizations.unit_system is
  'Org-wide default; a project may override via projects.unit_system.';

-- Public profile row for an authenticated user. Assumes Supabase Auth:
-- `auth.users` is managed by the auth provider and this table is the
-- app-visible profile, 1:1 with it. Swap the FK target if a different
-- auth provider is chosen in step 2.
create table users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       citext not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table memberships (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  -- Nullable: a pending invite is keyed by `invited_email` only, until the
  -- invitee signs up and this is backfilled to their `users.id`. See the
  -- note below and SCHEMA_REVIEW.md — this shape is an assumption, not a
  -- confirmed decision.
  user_id          uuid references users (id) on delete cascade,
  role             membership_role not null default 'member',
  invited_email    citext,
  invited_at       timestamptz,
  accepted_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,

  constraint memberships_has_user_or_invite
    check (user_id is not null or invited_email is not null),
  unique (organization_id, user_id)
);

-- Partial unique indexes: Postgres treats NULLs as distinct in a plain
-- UNIQUE constraint, so the table-level `unique (organization_id, user_id)`
-- above already allows any number of pending (user_id IS NULL) rows. This
-- index adds the guard that's actually missing: no two *pending* invites
-- for the same email in the same org.
create unique index memberships_org_pending_email_idx
  on memberships (organization_id, invited_email)
  where user_id is null and deleted_at is null;

create index memberships_user_id_idx on memberships (user_id) where deleted_at is null;
create index memberships_org_id_idx on memberships (organization_id) where deleted_at is null;

-- NOTE on the invite flow (step 2, not built yet): the brief asks for an
-- "invite flow" under organisations but doesn't specify whether an invite
-- creates a placeholder `users` row immediately or only a `memberships`
-- row keyed by `invited_email` until the invitee signs up. Modelled the
-- latter above — flagged as an open question in SCHEMA_REVIEW.md, not a
-- confirmed decision.
