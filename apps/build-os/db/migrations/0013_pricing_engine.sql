-- Build OS — 0013: the pricing engine
--
-- Spec 2.3, "implement exactly" (compounding), with the additive
-- alternative also supported via markup_settings.formula_mode per the
-- brief's own request to confirm which one before coding — see
-- SCHEMA_REVIEW.md section 2. Compounding is the default and, based on
-- the numbers in the reference screenshots (Preliminaries $254,900 cost
-- -> $291,701.12 sell price is a ×1.1444 multiplier, which is
-- 1.10 × 1.02 × 1.02 to 4 significant figures, not the ×1.14 an additive
-- uplift would give), is very likely what the reference product
-- actually uses. Proceeding on that basis; formula_mode stays a
-- per-project override if that turns out to be wrong for a specific
-- project.
--
--   line.total            = quantity * rate
--   directTotal           = sum(line.total) over direct lines
--   indirectTotal         = sum(line.total) over indirect lines
--   line.share            = directTotal = 0 ? 0 : line.total / directTotal
--   line.absorbedIndirect = indirectTotal * line.share
--   line.costWithIndirect = line.total + line.absorbedIndirect
--   line.sellPrice        = line.costWithIndirect
--                              * (1 + margin)   * (1 + risk)   * (1 + overheads)     [compounding]
--                            or line.costWithIndirect * (1 + margin + risk + overheads) [additive]
--   grandTotal            = sum(line.sellPrice) over direct lines only
--                            (indirect cost is already redistributed into
--                            direct lines via absorbedIndirect, so summing
--                            indirect sellPrice too would double-count it
--                            — indirect lines show no sell price at all,
--                            matching the mockup's "-").
--
-- "Server-side computation for all totals" (spec 8) is implemented as a
-- Postgres function + triggers, not application code: the database is
-- the server here. The client is free to render an instant live preview
-- (lib/pricing-engine.ts mirrors this exact formula for that purpose,
-- with a test asserting the two never disagree) but every persisted
-- number in pricing_lines is written by this function, never by a
-- client-side calculation.
--
-- Full precision is stored throughout (pricing_lines already uses
-- NUMERIC(18,6) from 0004); rounding to 2dp is a display concern only,
-- left to the UI layer.

create or replace function public.recompute_project_pricing(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id          uuid;
  v_direct_total    numeric(18,6);
  v_indirect_total  numeric(18,6);
  v_margin          numeric(9,6);
  v_risk            numeric(9,6);
  v_overheads       numeric(9,6);
  v_mode            markup_formula_mode;
begin
  select organization_id into v_org_id from projects where id = p_project_id;
  if v_org_id is null then
    raise exception 'recompute_project_pricing: project % not found', p_project_id;
  end if;
  -- Membership is checked only when there's an authenticated caller to
  -- check it against (auth.uid() is not null) — this function is EXECUTEd
  -- by `authenticated` for the direct-RPC path (a client could otherwise
  -- call it against a project it has no business touching) but is ALSO
  -- invoked internally by the pricing_lines/markup_settings triggers
  -- below, on every write regardless of role. A trigger-driven write from
  -- service_role, a migration, or any other session with no JWT claim set
  -- has auth.uid() = NULL; by that point RLS has already gated whether
  -- the write itself was allowed (or the caller bypasses RLS by design,
  -- same as service_role does everywhere else in this schema), so
  -- re-enforcing membership here would only break legitimate
  -- non-interactive writes without adding real protection.
  if auth.uid() is not null and not app.is_org_member(v_org_id) then
    raise exception 'recompute_project_pricing: not a member of this organization';
  end if;

  select coalesce(margin_pct, 0), coalesce(risk_pct, 0), coalesce(corporate_overheads_pct, 0), coalesce(formula_mode, 'compounding')
    into v_margin, v_risk, v_overheads, v_mode
  from markup_settings
  where project_id = p_project_id;

  if not found then
    v_margin := 0;
    v_risk := 0;
    v_overheads := 0;
    v_mode := 'compounding';
  end if;

  select coalesce(sum(quantity * rate), 0) into v_direct_total
  from pricing_lines
  where project_id = p_project_id and cost_type = 'direct' and deleted_at is null;

  select coalesce(sum(quantity * rate), 0) into v_indirect_total
  from pricing_lines
  where project_id = p_project_id and cost_type = 'indirect' and deleted_at is null;

  with computed as (
    select
      id,
      (quantity * rate) as line_total,
      (case when v_direct_total = 0 then 0 else (quantity * rate) / v_direct_total end) as share
    from pricing_lines
    where project_id = p_project_id and cost_type = 'direct' and deleted_at is null
  ),
  with_indirect as (
    select
      id,
      line_total,
      share * v_indirect_total as absorbed_indirect,
      line_total + (share * v_indirect_total) as cost_with_indirect
    from computed
  )
  update pricing_lines pl
  set line_total        = wi.line_total,
      absorbed_indirect = wi.absorbed_indirect,
      sell_price        = case
                             when v_mode = 'compounding' then
                               wi.cost_with_indirect * (1 + v_margin / 100) * (1 + v_risk / 100) * (1 + v_overheads / 100)
                             else
                               wi.cost_with_indirect * (1 + (v_margin + v_risk + v_overheads) / 100)
                           end,
      updated_at        = now()
  from with_indirect wi
  where pl.id = wi.id;

  -- Indirect lines: cost only. No absorption (they're the thing being
  -- absorbed), no sell price (mockup shows "-").
  update pricing_lines
  set line_total        = quantity * rate,
      absorbed_indirect = 0,
      sell_price        = null,
      updated_at        = now()
  where project_id = p_project_id and cost_type = 'indirect' and deleted_at is null;
end;
$$;

revoke all on function public.recompute_project_pricing(uuid) from public;
grant execute on function public.recompute_project_pricing(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Reactive recomputation (spec: "recomputed reactively on any quantity,
-- rate, or percentage change, with no page reload"). Triggers, not
-- application code calling recompute after every mutation, so this holds
-- no matter which code path changes a line (the UI, a future CSV
-- import, the workbook-apply-to-project action in step 7, ...).
--
-- The UPDATE OF column lists below are load-bearing, not incidental:
-- recompute_project_pricing()'s own UPDATE only ever touches
-- line_total/absorbed_indirect/sell_price/updated_at, none of which
-- appear in these lists, so its writes do not re-fire these triggers.
-- Omitting a column here (or adding line_total etc. to it) would create
-- infinite recursion or silently stop reacting to real edits — think
-- before changing either list.
-- ---------------------------------------------------------------------

create or replace function app.trigger_recompute_project_pricing()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_project_pricing(coalesce(new.project_id, old.project_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists pricing_lines_recompute on pricing_lines;
create trigger pricing_lines_recompute
  after insert or delete or update of quantity, rate, cost_type, section_id, deleted_at
  on pricing_lines
  for each row
  execute function app.trigger_recompute_project_pricing();

create or replace function app.trigger_recompute_project_pricing_from_markup()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_project_pricing(new.project_id);
  return new;
end;
$$;

drop trigger if exists markup_settings_recompute on markup_settings;
create trigger markup_settings_recompute
  after insert or update of margin_pct, risk_pct, corporate_overheads_pct, formula_mode
  on markup_settings
  for each row
  execute function app.trigger_recompute_project_pricing_from_markup();
