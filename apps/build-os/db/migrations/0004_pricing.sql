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
