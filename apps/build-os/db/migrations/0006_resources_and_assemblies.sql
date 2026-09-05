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
