-- Build OS — combined schema (migrations 0001-0012), for pasting into
-- the Supabase SQL Editor in one shot. Regenerated from
-- apps/build-os/db/migrations/. Assumes a Supabase project (needs its
-- built-in auth.users / auth.uid() / storage.* tables) -- do NOT run
-- this against a plain Postgres database without first applying
-- db/dev/0000_supabase_local_stub.sql.

-- ============================================================
-- 0001_extensions_and_enums.sql
-- ============================================================
-- Build OS — 0001: extensions and shared enum types
--
-- Assumption (flagged for review): this schema targets Supabase-style
-- Postgres — i.e. `auth.users` exists and `auth.uid()` is available inside
-- RLS policies. If Build OS ends up on a different auth provider, only
-- 0002_tenancy.sql (the `users` table's FK) and the `is_org_member()` /
-- `current_user_id()` helpers in 0009_row_level_security.sql need to
-- change; every other file is auth-provider-agnostic.

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive email

-- ---------------------------------------------------------------------
-- Membership role
-- Spec: "memberships (with roles)" — roles aren't enumerated in the brief.
-- Assumed a conventional 4-tier set; narrow or rename before building the
-- invite flow (step 2) if you want something different.
-- ---------------------------------------------------------------------
create type membership_role as enum ('owner', 'admin', 'member', 'viewer');

-- ---------------------------------------------------------------------
-- Project lifecycle status (spec 2, project detail header)
-- ---------------------------------------------------------------------
create type project_status as enum (
  'draft',
  'documents_uploaded',
  'estimate_analyzed',
  'tendered',
  'awarded'
);

create type project_size as enum ('small', 'medium', 'large', 'major');
-- small: <$1M, medium: $1M-$10M, large: $10M-$50M, major: >$50M
-- (thresholds are UI copy per the brief, not enforced by the DB)

-- ---------------------------------------------------------------------
-- Document processing status (spec 2.1, Project Docs table)
-- ---------------------------------------------------------------------
create type document_status as enum ('processing', 'ready', 'failed');

-- ---------------------------------------------------------------------
-- WBS / subcontractor procurement (spec 2.2)
-- ---------------------------------------------------------------------
create type delivery_method as enum ('self_perform', 'subcontract');

create type procurement_status as enum (
  'not_applicable',   -- "N/A" — self-perform packages
  'draft',
  'issued',
  'quotes_received',
  'preferred',
  'awarded'
);

-- ---------------------------------------------------------------------
-- Pricing schedule (spec 2.3)
-- ---------------------------------------------------------------------
create type cost_type as enum ('direct', 'indirect');

-- The brief specifies an exact compounding formula for sell price but
-- also explicitly asks to confirm it against a single additive uplift
-- before coding. Modelled as a per-project setting rather than a global
-- constant so both can exist side by side until that's decided — see
-- SCHEMA_REVIEW.md.
create type markup_formula_mode as enum ('compounding', 'additive');

-- ---------------------------------------------------------------------
-- Resources (spec 2.3 Project Resources / spec 3)
-- ---------------------------------------------------------------------
create type resource_type as enum (
  'labour',
  'material',
  'plant',
  'subcontractor',
  'overheads',
  'productivity',
  'quantity',
  'pricing_item',
  'variable'
);

-- ---------------------------------------------------------------------
-- Workbook templates (spec 4)
-- ---------------------------------------------------------------------
create type workbook_row_type as enum ('heading', 'resource');

-- ---------------------------------------------------------------------
-- Audit log (spec 6)
-- ---------------------------------------------------------------------
create type audit_action as enum ('insert', 'update', 'delete');

-- ---------------------------------------------------------------------
-- Units: kept as free-text (not an enum) because the resource unit list
-- in the brief ("mhr", "/m3", "/day", ...) is presentational and the org
-- can configure a metric or imperial unit system (spec 6). A `unit_system`
-- check constraint lives on `organizations`/`projects` instead (0002/0003).
-- ---------------------------------------------------------------------

-- ============================================================
-- 0002_tenancy.sql
-- ============================================================
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

-- ============================================================
-- 0003_projects_and_documents.sql
-- ============================================================
-- Build OS — 0003: projects, document categories, project documents

create table projects (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,

  name             text not null,
  client           text,
  industry         text,               -- free text per the Create Project modal (no fixed list given)
  location         text,
  project_size     project_size,
  status           project_status not null default 'draft',

  -- Per-project override of the org default (spec 6). NULL = inherit.
  currency_code    char(3),
  unit_system      text check (unit_system in ('metric', 'imperial')),

  -- Spec 1: "every new organisation is seeded with one read-only sample
  -- project ... all writes to it are blocked" — enforced in
  -- 0009_row_level_security.sql, not just hidden in the UI.
  is_sample        boolean not null default false,

  created_by       uuid references users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index projects_org_id_idx on projects (organization_id) where deleted_at is null;

-- ---------------------------------------------------------------------
-- Document categories: a real table (not an enum) even though the brief
-- only names 4 fixed categories, because it's listed as its own entity in
-- spec 6's table list. Kept global (not per-org) since the brief doesn't
-- ask for per-org customization of the category list; seeded below.
-- ---------------------------------------------------------------------
create table document_categories (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,     -- stable key for app code, e.g. 'scope_of_works'
  label       text not null,            -- display label, e.g. 'Scope of Works'
  sort_order  integer not null default 0
);

insert into document_categories (code, label, sort_order) values
  ('scope_of_works',        'Scope of Works',          1),
  ('bill_of_quantities',    'Bill of Quantities',       2),
  ('conditions_of_contract','Conditions of Contract',   3),
  ('tender_conditions',     'Tender Conditions',        4);

create table project_documents (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  project_id       uuid not null references projects (id) on delete cascade,

  category_id      uuid references document_categories (id),
  -- Nullable: the AI classification step (spec 5) may not have run yet,
  -- or may fail to confidently classify a document.

  file_name        text not null,
  file_type        text not null check (file_type in ('pdf', 'docx', 'xlsx')),
  size_bytes        bigint not null check (size_bytes >= 0),

  -- Object storage pointer, not the file itself (spec 8: "object storage
  -- for documents with signed URLs"). `storage_path` is provider-agnostic;
  -- the app resolves it to a signed URL on demand rather than storing one.
  storage_path     text not null,

  status           document_status not null default 'processing',
  status_error     text,               -- populated when status = 'failed'

  uploaded_by      uuid references users (id),
  uploaded_at      timestamptz not null default now(),
  deleted_at       timestamptz
);

create index project_documents_project_id_idx
  on project_documents (project_id) where deleted_at is null;
create index project_documents_org_id_idx
  on project_documents (organization_id) where deleted_at is null;

-- ============================================================
-- 0004_pricing.sql
-- ============================================================
-- Build OS — 0004: pricing schedule and markup settings
--
-- Money is NUMERIC, never float (spec 6). Precision/scale chosen as
-- NUMERIC(18,6): 6 decimal places keeps the "store full precision, round
-- to 2dp only at display time" requirement honest through the
-- proportional-share math in the pricing engine (spec 2.3) without
-- drifting into float-like imprecision. Quantities get the same scale so
-- fractional units (e.g. 0.125 t) don't get clipped.

create table pricing_sections (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  project_id       uuid not null references projects (id) on delete cascade,

  -- The mockup only shows heading sections inside Direct Costs (Earthworks,
  -- Concrete Works, ...); Indirect Costs lines sit directly under the band
  -- with no sub-heading. `cost_type` is kept here anyway so a project
  -- *can* add indirect sections later without a schema change — pricing
  -- lines are free to have a NULL section_id regardless (see below).
  cost_type        cost_type not null default 'direct',
  name             text not null,
  sort_order       integer not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index pricing_sections_project_id_idx
  on pricing_sections (project_id) where deleted_at is null;

create table pricing_lines (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  project_id       uuid not null references projects (id) on delete cascade,
  -- Nullable: Indirect Costs lines (IND.1, IND.2 in the mockup) have no
  -- section heading. Direct cost lines are expected to always have one,
  -- enforced at the app layer rather than the DB so mid-edit states
  -- (a line being moved between sections) don't get rejected mid-drag.
  section_id       uuid references pricing_sections (id) on delete set null,

  cost_type        cost_type not null,
  item_code        text not null,        -- user-editable & renumbered on reorder, e.g. '2.1', 'IND.1'
  description      text not null default '',
  quantity         numeric(18,6) not null default 0,
  unit             text,
  rate             numeric(18,6) not null default 0,

  -- --- Computed by the server-side pricing engine, not the DB ---------
  -- These three are cross-row-dependent (line.share needs the whole
  -- project's direct-cost total, per the formula in the brief), which
  -- rules out a plain Postgres GENERATED column (single-row scope only).
  -- The service layer recomputes and writes all three, for every line in
  -- the project, whenever any line's quantity/rate or the project's
  -- markup_settings change. Never written directly by client code.
  line_total          numeric(18,6) not null default 0,  -- quantity * rate
  absorbed_indirect   numeric(18,6) not null default 0,  -- 0 for indirect lines themselves
  sell_price          numeric(18,6),                     -- NULL for indirect lines (mockup shows "-")

  sort_order       integer not null default 0,

  -- Spec 5: "Every AI-generated line is flagged as such and requires
  -- human confirmation before it counts toward a total."
  is_ai_generated  boolean not null default false,
  ai_confirmed_at  timestamptz,

  created_by       uuid references users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index pricing_lines_project_id_idx
  on pricing_lines (project_id) where deleted_at is null;
create index pricing_lines_section_id_idx
  on pricing_lines (section_id) where deleted_at is null;

comment on column pricing_lines.ai_confirmed_at is
  'NULL means an AI-generated line has not yet been confirmed. This is a
   computation rule, not a row-validity one: the pricing engine excludes
   unconfirmed AI lines (is_ai_generated AND ai_confirmed_at IS NULL) from
   directTotal/indirectTotal, it is not enforced as a DB constraint.';

-- ---------------------------------------------------------------------
-- Markup settings: one row per project. `formula_mode` captures the
-- brief's own open question — compounding (1+margin)(1+risk)(1+overheads)
-- vs. a single additive uplift (1+margin+risk+overheads) — as a per-project
-- setting rather than picking one and hard-coding it. See SCHEMA_REVIEW.md;
-- this still needs your confirmation before the pricing engine is built.
-- ---------------------------------------------------------------------
create table markup_settings (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations (id) on delete cascade,
  project_id               uuid not null unique references projects (id) on delete cascade,

  margin_pct               numeric(9,6) not null default 0,
  risk_pct                 numeric(9,6) not null default 0,
  corporate_overheads_pct  numeric(9,6) not null default 0,
  formula_mode             markup_formula_mode not null default 'compounding',

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ============================================================
-- 0005_wbs.sql
-- ============================================================
-- Build OS — 0005: work breakdown structure (subcontractors tab, spec 2.2)

create table wbs_sections (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  project_id       uuid not null references projects (id) on delete cascade,

  name             text not null,       -- e.g. 'Preliminaries', 'Construction'
  sort_order       integer not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index wbs_sections_project_id_idx
  on wbs_sections (project_id) where deleted_at is null;

create table wbs_packages (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,
  project_id       uuid not null references projects (id) on delete cascade,
  section_id       uuid not null references wbs_sections (id) on delete cascade,

  name             text not null,               -- e.g. 'Site Facilities'
  description      text,                        -- shown truncated to one line in the UI
  package_code     text not null,               -- e.g. '220' — user-editable
  delivery_method  delivery_method not null default 'subcontract',
  procurement_status procurement_status not null default 'draft',

  -- "Packages link to pricing-schedule sections so a package total can be
  -- read off the estimate." Nullable: a package can exist before it's
  -- wired to an estimate section.
  pricing_section_id uuid references pricing_sections (id) on delete set null,

  sort_order       integer not null default 0,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

-- "Package codes are user-editable but must be unique within a project."
-- A partial unique index (not a table constraint) so a soft-deleted
-- package's old code can be reused by a new one.
create unique index wbs_packages_code_unique_per_project
  on wbs_packages (project_id, package_code)
  where deleted_at is null;

create index wbs_packages_project_id_idx
  on wbs_packages (project_id) where deleted_at is null;
create index wbs_packages_section_id_idx
  on wbs_packages (section_id) where deleted_at is null;

comment on column wbs_packages.procurement_status is
  'not_applicable is the DB spelling of the UI''s "N/A" badge, used when delivery_method = self_perform.';

-- ============================================================
-- 0006_resources_and_assemblies.sql
-- ============================================================
-- Build OS — 0006: org resource library, assemblies, and project copies
--
-- Two parallel table families, matching the two places the brief shows a
-- Base Resources / Assemblies pair of tabs: the org-level library (spec 3)
-- and each project's own copy (spec 2.3 "Project Resources" — "resources
-- copied from company library for this project ... copied by value at
-- project creation, so later edits to the company library do not
-- retroactively change a priced project"). The project-level tables are
-- structurally identical to the org-level ones (not FK'd to them for live
-- values) plus a nullable `source_*_id` kept only for traceability.

-- =======================================================================
-- Org-level library (spec 3)
-- =======================================================================

create table resources (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,

  resource_type    resource_type not null,
  description      text not null,
  unit             text,             -- 'mhr', '/m3', '/day', 'm²/hr', etc. — free text, see 0001 notes
  rate_or_value    numeric(18,6) not null default 0,
  -- Semantics of rate_or_value depend on resource_type (spec 2.3):
  --   labour/material/plant/subcontractor/overheads -> a money rate
  --   productivity                                  -> a rate of output (not money)
  --   quantity                                       -> a measured quantity
  --   variable                                       -> a dimensionless factor
  --   pricing_item                                   -> not typically used directly;
  --                                                      this resource type marks a
  --                                                      workbook/assembly row that maps
  --                                                      straight onto a pricing_lines row
  --                                                      when applied to a project
  comments         text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index resources_org_id_idx on resources (organization_id) where deleted_at is null;
create index resources_type_idx on resources (organization_id, resource_type) where deleted_at is null;

create table assemblies (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,

  name             text not null,
  unit             text,
  comments         text,

  -- Derived, not typed — computed server-side from assembly_components,
  -- same reasoning as pricing_lines.sell_price in 0004 (cross-row
  -- dependency rules out a Postgres GENERATED column). Recomputed whenever
  -- a component or a referenced resource's rate changes.
  derived_rate     numeric(18,6),

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index assemblies_org_id_idx on assemblies (organization_id) where deleted_at is null;

create table assembly_components (
  id                   uuid primary key default gen_random_uuid(),
  organization_id      uuid not null references organizations (id) on delete cascade,
  assembly_id          uuid not null references assemblies (id) on delete cascade,
  component_resource_id uuid not null references resources (id),
  -- References a base resource only (no nested assemblies) — the brief's
  -- example ("Concrete Volume x Reinforcement Ratio") composes Quantity
  -- and Variable resources, not other assemblies. Revisit if nested
  -- assemblies turn out to be needed.

  quantity_or_formula  text not null,   -- numeric literal or a formula string, same grammar as workbook_rows.qty_formula (spec 4)
  sort_order           integer not null default 0,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create index assembly_components_assembly_id_idx
  on assembly_components (assembly_id) where deleted_at is null;

-- =======================================================================
-- Project-level copies (spec 2.3)
-- =======================================================================

create table project_resources (
  id                 uuid primary key default gen_random_uuid(),
  organization_id    uuid not null references organizations (id) on delete cascade,
  project_id         uuid not null references projects (id) on delete cascade,

  -- Traceability only — never joined for live values. See file header.
  source_resource_id uuid references resources (id) on delete set null,

  resource_type      resource_type not null,
  description        text not null,
  unit               text,
  rate_or_value      numeric(18,6) not null default 0,
  comments           text,

  copied_at          timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

create index project_resources_project_id_idx
  on project_resources (project_id) where deleted_at is null;

create table project_assemblies (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references organizations (id) on delete cascade,
  project_id          uuid not null references projects (id) on delete cascade,
  source_assembly_id  uuid references assemblies (id) on delete set null,

  name                text not null,
  unit                text,
  comments            text,
  derived_rate        numeric(18,6),

  copied_at           timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create index project_assemblies_project_id_idx
  on project_assemblies (project_id) where deleted_at is null;

create table project_assembly_components (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references organizations (id) on delete cascade,
  project_assembly_id      uuid not null references project_assemblies (id) on delete cascade,
  -- Points at the project's own copied resource, not the org library.
  component_project_resource_id uuid not null references project_resources (id),

  quantity_or_formula      text not null,
  sort_order               integer not null default 0,

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  deleted_at               timestamptz
);

create index project_assembly_components_assembly_id_idx
  on project_assembly_components (project_assembly_id) where deleted_at is null;

-- ============================================================
-- 0007_workbook_templates.sql
-- ============================================================
-- Build OS — 0007: workbook templates (spec 4)

create table workbook_templates (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,

  name             text not null,        -- e.g. 'Pricing Workbook: Estimation Sheet'
  description      text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create index workbook_templates_org_id_idx
  on workbook_templates (organization_id) where deleted_at is null;

create table workbook_rows (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations (id) on delete cascade,
  workbook_template_id  uuid not null references workbook_templates (id) on delete cascade,

  row_type              workbook_row_type not null default 'resource',

  -- NULL for heading rows and for '-- Custom Item --' resource rows.
  resource_id           uuid references resources (id) on delete set null,

  -- The row's referenceable name for formulas elsewhere in the sheet
  -- (spec 4: "a formula referencing other rows and resources by name").
  -- Defaults to the linked resource's description at selection time but
  -- stored independently so renaming a row doesn't require rewriting
  -- every formula that already referenced it, and so a heading row can
  -- carry section text with nothing to compute.
  description           text not null default '',

  unit                   text,
  rate                   numeric(18,6),

  -- Free text: either a plain number or a formula string
  -- (e.g. 'Concrete Volume * Reinforcement Ratio'). NULL/ignored for
  -- heading rows.
  qty_formula            text,

  -- Server-computed (spec: "Formulas must resolve in dependency order and
  -- detect circular references" — a topological evaluation across rows,
  -- not expressible as a single-row GENERATED column). Written by the
  -- formula evaluator service, never directly by client code.
  computed_total         numeric(18,6),

  notes                  text,
  sort_order             integer not null default 0,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  deleted_at             timestamptz
);

create index workbook_rows_template_id_idx
  on workbook_rows (workbook_template_id) where deleted_at is null;

-- NOTE: "A completed workbook can be applied to a project to generate
-- pricing schedule lines" describes an action, not a new persisted
-- entity — modelled as a service-layer operation that reads
-- workbook_rows and writes pricing_lines rows. Flagged in
-- SCHEMA_REVIEW.md in case you'd rather have a `workbook_applications`
-- table to audit which workbook produced which pricing lines.

-- ============================================================
-- 0008_audit_log.sql
-- ============================================================
-- Build OS — 0008: audit log
--
-- Spec 6: "Soft deletes plus an audit log capturing user, timestamp,
-- field, old value, new value on every pricing change." Modelled
-- generically (table_name + record_id) rather than one audit table per
-- entity, since the requirement in spec 2's markup panel and pricing
-- schedule implies this needs to cover pricing_lines and markup_settings
-- at minimum, and likely wbs_packages status changes too.
--
-- Deliberately NOT a blanket trigger-based "audit everything" mechanism:
-- generic row-level triggers that diff entire NEW/OLD rows tend to be
-- noisy (they'd log sort_order drag-reorders as loudly as a rate change)
-- and can't easily express "field" as anything more specific than a
-- whole-row jsonb blob. Recommend the write path goes through a service
-- layer that calls a small `log_change(...)` helper (or a narrowly
-- targeted trigger per audited column) rather than a single catch-all
-- trigger on every table — worth confirming before step 5 (pricing engine)
-- is built, since that's the first place this actually gets used.

create table audit_log (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references organizations (id) on delete cascade,

  actor_user_id    uuid references users (id),
  occurred_at      timestamptz not null default now(),

  table_name       text not null,
  record_id        uuid not null,
  action           audit_action not null,

  -- NULL `field_name` + row-shaped old/new_value = a whole-row insert or
  -- delete. Non-null `field_name` + scalar-shaped old/new_value (still
  -- jsonb, e.g. `"12.50"` or `12.50`) = a single-field update, which is
  -- the common case for pricing edits.
  field_name       text,
  old_value        jsonb,
  new_value        jsonb,

  created_at       timestamptz not null default now()
);

create index audit_log_org_id_idx on audit_log (organization_id);
create index audit_log_record_idx on audit_log (table_name, record_id);
create index audit_log_actor_idx on audit_log (actor_user_id);

comment on table audit_log is
  'Append-only. No updated_at/deleted_at/RLS write policies other than
   INSERT — see 0009_row_level_security.sql. Rows are never edited or
   removed once written.';

-- ============================================================
-- 0009_row_level_security.sql
-- ============================================================
-- Build OS — 0009: row-level security
--
-- Spec 6: "Row-level security scoped by organisation. No query may cross
-- tenants." and "Sample/demo records flagged and read-only at the data
-- layer, not just in the UI."
--
-- Assumption carried from 0001: `auth.uid()` exists (Supabase Auth). If a
-- different auth provider is chosen in step 2, only `app.current_user_id()`
-- below needs to change — every policy in this file calls that function
-- rather than `auth.uid()` directly, specifically so this swap is
-- localized to one place.

create schema if not exists app;

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- True if the current user has an accepted (user_id is set), non-deleted
-- membership in the given organization. SECURITY DEFINER so it can read
-- `memberships` even from inside another table's RLS-restricted query
-- plan without the caller separately needing a SELECT grant on
-- memberships for every check.
create or replace function app.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.organization_id = p_organization_id
      and m.user_id = app.current_user_id()
      and m.deleted_at is null
  );
$$;

create or replace function app.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.organization_id = p_organization_id
      and m.user_id = app.current_user_id()
      and m.role in ('owner', 'admin')
      and m.deleted_at is null
  );
$$;

-- True if the given project may be written to: it belongs to an org the
-- current user is a member of, is not soft-deleted, and is not the
-- read-only sample project. Used by every project-child table's
-- INSERT/UPDATE/DELETE policy; SELECT policies deliberately do NOT use
-- this (sample project content must stay readable, only writes are
-- blocked).
create or replace function app.project_is_writable(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    where p.id = p_project_id
      and p.deleted_at is null
      and p.is_sample = false
      and app.is_org_member(p.organization_id)
  );
$$;

-- =======================================================================
-- organizations
-- =======================================================================
alter table organizations enable row level security;
alter table organizations force row level security;

create policy organizations_select on organizations
  for select using (app.is_org_member(id));

-- NOTE: no INSERT policy here on purpose. Creating an organization has to
-- also create the founding membership row (as 'owner') in the same
-- transaction, or the creator would be locked out by RLS the instant the
-- INSERT commits. Recommend a SECURITY DEFINER `create_organization(name)`
-- RPC function in step 2 that does both inserts atomically, rather than a
-- bare client-side INSERT policy on this table. Flagged in
-- SCHEMA_REVIEW.md.

create policy organizations_update on organizations
  for update
  using (app.is_org_admin(id))
  with check (app.is_org_admin(id));

-- =======================================================================
-- users
-- =======================================================================
alter table users enable row level security;
alter table users force row level security;

-- A user can see their own profile, plus the profiles of anyone who
-- shares at least one organization with them (needed for team rosters,
-- "created_by" attribution, etc.).
create policy users_select on users
  for select using (
    id = app.current_user_id()
    or exists (
      select 1
      from memberships mine
      join memberships theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = app.current_user_id()
        and mine.deleted_at is null
        and theirs.user_id = users.id
        and theirs.deleted_at is null
    )
  );

create policy users_update_self on users
  for update
  using (id = app.current_user_id())
  with check (id = app.current_user_id());

-- =======================================================================
-- memberships
-- =======================================================================
alter table memberships enable row level security;
alter table memberships force row level security;

create policy memberships_select on memberships
  for select using (app.is_org_member(organization_id));

create policy memberships_write on memberships
  for all
  using (app.is_org_admin(organization_id))
  with check (app.is_org_admin(organization_id));

-- =======================================================================
-- projects
-- =======================================================================
alter table projects enable row level security;
alter table projects force row level security;

create policy projects_select on projects
  for select using (app.is_org_member(organization_id));

create policy projects_insert on projects
  for insert with check (app.is_org_member(organization_id) and is_sample = false);
  -- Clients can never insert a row with is_sample = true; that flag is
  -- set only by the seeding routine in step 2.

create policy projects_update on projects
  for update
  using (app.is_org_member(organization_id) and is_sample = false)
  with check (app.is_org_member(organization_id) and is_sample = false);

create policy projects_delete on projects
  for delete using (app.is_org_member(organization_id) and is_sample = false);

-- =======================================================================
-- Generic shape for every project-child table below:
--   SELECT             -> org member (sample project content stays visible)
--   INSERT/UPDATE/DELETE -> org member AND app.project_is_writable(project_id)
-- =======================================================================

-- --- project_documents --------------------------------------------------
alter table project_documents enable row level security;
alter table project_documents force row level security;

create policy project_documents_select on project_documents
  for select using (app.is_org_member(organization_id));

create policy project_documents_write on project_documents
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

-- --- wbs_sections / wbs_packages ----------------------------------------
alter table wbs_sections enable row level security;
alter table wbs_sections force row level security;

create policy wbs_sections_select on wbs_sections
  for select using (app.is_org_member(organization_id));

create policy wbs_sections_write on wbs_sections
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

alter table wbs_packages enable row level security;
alter table wbs_packages force row level security;

create policy wbs_packages_select on wbs_packages
  for select using (app.is_org_member(organization_id));

create policy wbs_packages_write on wbs_packages
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

-- --- pricing_sections / pricing_lines / markup_settings ------------------
alter table pricing_sections enable row level security;
alter table pricing_sections force row level security;

create policy pricing_sections_select on pricing_sections
  for select using (app.is_org_member(organization_id));

create policy pricing_sections_write on pricing_sections
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

alter table pricing_lines enable row level security;
alter table pricing_lines force row level security;

create policy pricing_lines_select on pricing_lines
  for select using (app.is_org_member(organization_id));

create policy pricing_lines_write on pricing_lines
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

alter table markup_settings enable row level security;
alter table markup_settings force row level security;

create policy markup_settings_select on markup_settings
  for select using (app.is_org_member(organization_id));

create policy markup_settings_write on markup_settings
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

-- --- project_resources / project_assemblies / project_assembly_components
alter table project_resources enable row level security;
alter table project_resources force row level security;

create policy project_resources_select on project_resources
  for select using (app.is_org_member(organization_id));

create policy project_resources_write on project_resources
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

alter table project_assemblies enable row level security;
alter table project_assemblies force row level security;

create policy project_assemblies_select on project_assemblies
  for select using (app.is_org_member(organization_id));

create policy project_assemblies_write on project_assemblies
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

alter table project_assembly_components enable row level security;
alter table project_assembly_components force row level security;

create policy project_assembly_components_select on project_assembly_components
  for select using (app.is_org_member(organization_id));

-- This table has no project_id of its own — reach it via its parent
-- project_assembly row.
create policy project_assembly_components_write on project_assembly_components
  for all
  using (
    app.is_org_member(organization_id)
    and exists (
      select 1 from project_assemblies pa
      where pa.id = project_assembly_components.project_assembly_id
        and app.project_is_writable(pa.project_id)
    )
  )
  with check (
    app.is_org_member(organization_id)
    and exists (
      select 1 from project_assemblies pa
      where pa.id = project_assembly_components.project_assembly_id
        and app.project_is_writable(pa.project_id)
    )
  );

-- =======================================================================
-- Org-level library — no sample-project concept, plain membership CRUD
-- =======================================================================

alter table resources enable row level security;
alter table resources force row level security;
create policy resources_select on resources for select using (app.is_org_member(organization_id));
create policy resources_write on resources for all
  using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table assemblies enable row level security;
alter table assemblies force row level security;
create policy assemblies_select on assemblies for select using (app.is_org_member(organization_id));
create policy assemblies_write on assemblies for all
  using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table assembly_components enable row level security;
alter table assembly_components force row level security;
create policy assembly_components_select on assembly_components for select using (app.is_org_member(organization_id));
create policy assembly_components_write on assembly_components for all
  using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table workbook_templates enable row level security;
alter table workbook_templates force row level security;
create policy workbook_templates_select on workbook_templates for select using (app.is_org_member(organization_id));
create policy workbook_templates_write on workbook_templates for all
  using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table workbook_rows enable row level security;
alter table workbook_rows force row level security;
create policy workbook_rows_select on workbook_rows for select using (app.is_org_member(organization_id));
create policy workbook_rows_write on workbook_rows for all
  using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

-- =======================================================================
-- document_categories — global fixed lookup, readable by anyone
-- authenticated, writable only via migrations/service role (no policy).
-- =======================================================================
alter table document_categories enable row level security;
alter table document_categories force row level security;

create policy document_categories_select on document_categories
  for select using (app.current_user_id() is not null);

-- =======================================================================
-- audit_log — append-only
-- =======================================================================
alter table audit_log enable row level security;
alter table audit_log force row level security;

create policy audit_log_select on audit_log
  for select using (app.is_org_member(organization_id));

create policy audit_log_insert on audit_log
  for insert with check (
    app.is_org_member(organization_id)
    and actor_user_id = app.current_user_id()
  );

-- No update/delete policy for any role: rows are immutable once written.

-- ============================================================
-- 0010_org_rpc.sql
-- ============================================================
-- Build OS — 0010: organization creation + sample-project seeding RPC
--
-- Called from the app via `supabase.rpc('create_organization_with_owner', ...)`
-- right after a new user's first sign-in with no pending invite (step 2,
-- "self-serve, auto-named org"). Must do all three inserts — org, founding
-- membership, sample project (+ its WBS/pricing content) — in one
-- transaction: a bare client-side INSERT into `organizations` would lock
-- the creator out the instant it commits, since RLS requires an existing
-- membership to read/write anything in that org (see 0009's comment on
-- why `organizations` has no INSERT policy).
--
-- These three are deliberately created in `public`, not `app`: Supabase's
-- REST API (what `supabase.rpc(...)` calls) only exposes the `public`
-- schema by default, so a function meant to be called directly from the
-- client has to live there. `app` stays reserved for the RLS-internal
-- helpers from 0009 and the auth trigger below, none of which are ever
-- called over the API directly.
--
-- Relies on being created by a role that bypasses RLS (BYPASSRLS or table
-- ownership without FORCE, though these tables use FORCE — so BYPASSRLS
-- specifically). On Supabase, migrations run as a superuser-equivalent
-- role, so this holds without extra setup; if applying by hand as a
-- non-superuser role, grant it BYPASSRLS first.

create or replace function public.create_organization_with_owner(
  p_org_name      text,
  p_currency_code char(3) default 'USD',
  p_unit_system   text default 'metric'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id  uuid;
begin
  if v_user_id is null then
    raise exception 'create_organization_with_owner: no authenticated user';
  end if;

  insert into organizations (name, currency_code, unit_system)
  values (p_org_name, p_currency_code, p_unit_system)
  returning id into v_org_id;

  insert into memberships (organization_id, user_id, role, accepted_at)
  values (v_org_id, v_user_id, 'owner', now());

  perform public.seed_sample_project(v_org_id);

  return v_org_id;
end;
$$;

-- Only authenticated users may call this (anon would have no auth.uid()
-- and the function already rejects that, but denying at the grant level
-- too is cheap and explicit).
revoke all on function public.create_organization_with_owner(text, char(3), text) from public;
grant execute on function public.create_organization_with_owner(text, char(3), text) to authenticated;

-- ---------------------------------------------------------------------
-- Sample project seed. Deliberately modest — enough to be recognizable
-- and to give steps 4-7 real rows to render against as their UIs land,
-- not an attempt to reproduce the reference screenshots' exact numbers.
-- Callable standalone (e.g. a future "restore sample project" action),
-- which is why it's a separate function from the org-creation one above.
-- ---------------------------------------------------------------------
create or replace function public.seed_sample_project(p_org_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id      uuid;
  v_prelim_section  uuid;
  v_earthworks_section uuid;
  v_wbs_prelim      uuid;
begin
  insert into projects (
    organization_id, name, client, industry, location, project_size,
    status, is_sample
  ) values (
    p_org_id, 'Commercial Construction Project', 'ABC Developer', 'Commercial',
    'Melbourne, Australia', 'large', 'estimate_analyzed', true
  )
  returning id into v_project_id;

  -- WBS: one section, a couple of packages, mirroring the brief's own
  -- "Preliminaries" example.
  insert into wbs_sections (organization_id, project_id, name, sort_order)
  values (p_org_id, v_project_id, 'Preliminaries', 1)
  returning id into v_wbs_prelim;

  insert into wbs_packages (
    organization_id, project_id, section_id, name, description,
    package_code, delivery_method, procurement_status, sort_order
  ) values
    (p_org_id, v_project_id, v_wbs_prelim, 'Site Facilities',
     'Temporary offices, amenities', '220', 'self_perform', 'not_applicable', 1),
    (p_org_id, v_project_id, v_wbs_prelim, 'Design Services',
     'Architectural and engineering', '210', 'subcontract', 'awarded', 2),
    (p_org_id, v_project_id, v_wbs_prelim, 'Project Management',
     'PM, supervision, administration', '230', 'self_perform', 'not_applicable', 3);

  -- Pricing: two direct-cost sections with one line each, plus markup
  -- settings. Sell prices are intentionally left NULL here (0 rows
  -- computed) rather than hand-computed — that's the pricing engine's
  -- job (step 5), not the seed script's.
  insert into pricing_sections (organization_id, project_id, cost_type, name, sort_order)
  values (p_org_id, v_project_id, 'direct', 'Preliminaries', 1)
  returning id into v_prelim_section;

  insert into pricing_sections (organization_id, project_id, cost_type, name, sort_order)
  values (p_org_id, v_project_id, 'direct', 'Earthworks', 2)
  returning id into v_earthworks_section;

  insert into pricing_lines (
    organization_id, project_id, section_id, cost_type, item_code,
    description, quantity, unit, rate, line_total, sort_order
  ) values
    (p_org_id, v_project_id, v_prelim_section, 'direct', '1',
     'Preliminaries', 8, 'weeks', 31862.50, 8 * 31862.50, 1),
    (p_org_id, v_project_id, v_earthworks_section, 'direct', '2.1',
     'Earthworks', 5000, 'm3', 26.13, 5000 * 26.13, 2);

  insert into markup_settings (organization_id, project_id, margin_pct, risk_pct, corporate_overheads_pct, formula_mode)
  values (p_org_id, v_project_id, 10, 2, 2, 'compounding');

  return v_project_id;
end;
$$;

revoke all on function public.seed_sample_project(uuid) from public;
grant execute on function public.seed_sample_project(uuid) to authenticated;

comment on function public.seed_sample_project(uuid) is
  'Idempotency note: calling this twice for the same org creates a second
   sample project rather than replacing the first. Fine for the
   create_organization_with_owner call site (one org, one call, ever);
   guard against double-seeding yourself if this is ever exposed as a
   user-triggered action.';

-- ---------------------------------------------------------------------
-- public.users profile row, auto-created on signup.
--
-- Without this, `users` (and therefore `memberships`, which FKs to it)
-- never gets populated at all — Supabase only creates the `auth.users`
-- row on signup, the public-schema profile table is entirely our own and
-- nothing fills it in unless we do. Standard Supabase pattern: a trigger
-- on `auth.users` insert. Lives in `app`, not `public`, since triggers
-- fire via the Postgres trigger mechanism directly and are never called
-- over the REST API — no exposure needed.
-- ---------------------------------------------------------------------
create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- Pending-invite acceptance: called right after a user's first
-- successful sign-in (any sign-in, actually — cheap and idempotent) to
-- backfill any membership rows that were invited by their email before
-- they had an account. See STEP2_PLAN.md 2a. In `public` — called
-- directly from the client via supabase.rpc(), same reasoning as the two
-- functions above.
--
-- Reads the email from auth.users directly (not the public.users profile
-- copy) so this doesn't depend on the trigger above having already run
-- in the same transaction.
-- ---------------------------------------------------------------------
create or replace function public.accept_pending_invites()
returns setof uuid  -- organization_ids newly accepted, if any
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   citext;
begin
  if v_user_id is null then
    raise exception 'accept_pending_invites: no authenticated user';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    return;
  end if;

  return query
  update memberships
  set user_id = v_user_id,
      accepted_at = now(),
      updated_at = now()
  where invited_email = v_email
    and user_id is null
    and deleted_at is null
  returning organization_id;
end;
$$;

revoke all on function public.accept_pending_invites() from public;
grant execute on function public.accept_pending_invites() to authenticated;

-- ============================================================
-- 0011_storage.sql
-- ============================================================
-- Build OS — 0011: object storage for project documents
--
-- Spec 8: "Object storage for documents with signed URLs." Supabase
-- Storage's `storage.objects` table is a real Postgres table with RLS
-- just like any other — so tenant isolation and the sample-project
-- read-only rule are enforced the exact same way as everywhere else in
-- this schema, via the path the app chooses to upload to rather than a
-- new mechanism.
--
-- Path convention (enforced by these policies, not just convention):
--   <organization_id>/<project_id>/<uuid>-<original_filename>
-- `storage.foldername(name)` splits the object path on '/' and returns
-- the folder segments, so foldername(name)[1] is the org id and
-- foldername(name)[2] is the project id.

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- Supabase enables RLS on storage.objects by default; FORCE isn't
-- available/needed here (Supabase already owns and manages this table).
alter table storage.objects enable row level security;

create policy project_documents_storage_select on storage.objects
  for select
  using (
    bucket_id = 'project-documents'
    and app.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy project_documents_storage_insert on storage.objects
  for insert
  with check (
    bucket_id = 'project-documents'
    and app.is_org_member((storage.foldername(name))[1]::uuid)
    and app.project_is_writable((storage.foldername(name))[2]::uuid)
  );

create policy project_documents_storage_delete on storage.objects
  for delete
  using (
    bucket_id = 'project-documents'
    and app.is_org_member((storage.foldername(name))[1]::uuid)
    and app.project_is_writable((storage.foldername(name))[2]::uuid)
  );

-- No update policy: documents are replaced by deleting and re-uploading,
-- not edited in place.

-- ============================================================
-- 0012_create_project.sql
-- ============================================================
-- Build OS — 0012: project creation with resource-library copy-by-value
--
-- Spec 2.3: "Project Resource Library — resources copied from company
-- library for this project ... copied by value at project creation, so
-- later edits to the company library do not retroactively change a
-- priced project." A plain client-side INSERT into `projects` followed
-- by separate INSERTs into project_resources/project_assemblies would
-- work under RLS (unlike organization creation, an existing org member
-- creating a project isn't locking themselves out of anything) — but
-- doing the copy as a second round-trip from the client risks a project
-- existing with an incomplete or missing resource snapshot if the
-- client dies or errors between the two calls. One function, one
-- transaction.

create or replace function public.create_project(
  p_organization_id text,
  p_name             text,
  p_client           text default null,
  p_industry         text default null,
  p_location         text default null,
  p_project_size     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id     uuid := p_organization_id::uuid;
  v_project_id uuid;
begin
  if not app.is_org_member(v_org_id) then
    raise exception 'create_project: not a member of this organization';
  end if;

  insert into projects (organization_id, name, client, industry, location, project_size, status, is_sample)
  values (v_org_id, p_name, p_client, p_industry, p_location, p_project_size::project_size, 'draft', false)
  returning id into v_project_id;

  -- Copy-by-value: base resources.
  insert into project_resources (organization_id, project_id, source_resource_id, resource_type, description, unit, rate_or_value, comments)
  select v_org_id, v_project_id, r.id, r.resource_type, r.description, r.unit, r.rate_or_value, r.comments
  from resources r
  where r.organization_id = v_org_id;

  -- Copy-by-value: assemblies, and their components re-pointed at the
  -- newly-copied project_resources rows (not the org-level resources —
  -- see 0006's header comment on why project_assembly_components
  -- references project_resources, not resources).
  with copied_assemblies as (
    insert into project_assemblies (organization_id, project_id, source_assembly_id, name, unit, comments, derived_rate)
    select v_org_id, v_project_id, a.id, a.name, a.unit, a.comments, a.derived_rate
    from assemblies a
    where a.organization_id = v_org_id
    returning id, source_assembly_id
  ),
  resource_id_map as (
    select pr.source_resource_id as org_resource_id, pr.id as project_resource_id
    from project_resources pr
    where pr.project_id = v_project_id
  )
  insert into project_assembly_components (organization_id, project_assembly_id, component_project_resource_id, quantity_or_formula, sort_order)
  select v_org_id, ca.id, rim.project_resource_id, ac.quantity_or_formula, ac.sort_order
  from assembly_components ac
  join copied_assemblies ca on ca.source_assembly_id = ac.assembly_id
  join resource_id_map rim on rim.org_resource_id = ac.component_resource_id
  where ac.organization_id = v_org_id;

  return v_project_id;
end;
$$;

revoke all on function public.create_project(text, text, text, text, text, text) from public;
grant execute on function public.create_project(text, text, text, text, text, text) to authenticated;

comment on function public.create_project(text, text, text, text, text, text) is
  'organization_id and project_size are text, not uuid/project_size, purely
   because PostgREST''s RPC parameter binding is friendlier with text for
   enum/uuid args called from a plain JS object — cast internally instead.
   p_project_size accepts NULL or one of small/medium/large/major.';

