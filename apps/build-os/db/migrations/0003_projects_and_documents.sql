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
