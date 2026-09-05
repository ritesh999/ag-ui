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
