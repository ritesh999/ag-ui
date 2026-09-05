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
