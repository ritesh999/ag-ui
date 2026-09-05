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
