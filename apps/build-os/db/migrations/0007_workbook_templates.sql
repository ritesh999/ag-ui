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
