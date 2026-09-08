-- Build OS — 0014: exclude unconfirmed AI-generated lines from totals
--
-- Spec 5: "Every AI-generated line is flagged as such and requires human
-- confirmation before it counts toward a total." 0004_pricing.sql's own
-- comment on ai_confirmed_at documented this as the pricing engine's job
-- ("it is not enforced as a DB constraint") but 0013's first version of
-- recompute_project_pricing() never actually implemented it — every
-- direct line counted toward directTotal/grandTotal regardless of
-- is_ai_generated/ai_confirmed_at. Fixed here rather than left as a gap
-- once step 8 (AI integration) made it observable.
--
-- Behavior for a direct line where is_ai_generated AND ai_confirmed_at
-- IS NULL ("unconfirmed AI line"):
--   - line_total is still computed (quantity * rate) so the user can see
--     what the suggested line would cost before deciding to confirm it.
--   - It does NOT contribute to directTotal or indirectTotal, so it
--     can't shift the indirect-cost share of every other line just by
--     existing unconfirmed.
--   - absorbed_indirect = 0 and sell_price = NULL (mirrors how indirect
--     lines show no sell price) — nothing about it "counts" until
--     confirmed.
-- The instant ai_confirmed_at is set (a user confirms the suggestion),
-- the trigger below fires and the line is repriced exactly like any
-- normal direct line, sharing in the indirect-cost split like everyone
-- else.

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
  where project_id = p_project_id and cost_type = 'direct' and deleted_at is null
    and not (is_ai_generated and ai_confirmed_at is null);

  select coalesce(sum(quantity * rate), 0) into v_indirect_total
  from pricing_lines
  where project_id = p_project_id and cost_type = 'indirect' and deleted_at is null
    and not (is_ai_generated and ai_confirmed_at is null);

  with computed as (
    select
      id,
      (quantity * rate) as line_total,
      (case when v_direct_total = 0 then 0 else (quantity * rate) / v_direct_total end) as share
    from pricing_lines
    where project_id = p_project_id and cost_type = 'direct' and deleted_at is null
      and not (is_ai_generated and ai_confirmed_at is null)
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
  where project_id = p_project_id and cost_type = 'indirect' and deleted_at is null
    and not (is_ai_generated and ai_confirmed_at is null);

  -- Unconfirmed AI lines (direct or indirect): show their own cost so the
  -- reviewer can see what they'd be agreeing to, but contribute nothing
  -- to any total and carry no sell price yet.
  update pricing_lines
  set line_total        = quantity * rate,
      absorbed_indirect = 0,
      sell_price        = null,
      updated_at        = now()
  where project_id = p_project_id and deleted_at is null
    and is_ai_generated and ai_confirmed_at is null;
end;
$$;

-- The trigger's UPDATE OF column list (0013) needs ai_confirmed_at added:
-- confirming (or un-confirming) an AI-generated line is exactly the kind
-- of change that should move it in or out of the totals immediately, and
-- is_ai_generated for completeness (in case a line's flag is ever
-- corrected after the fact). Neither column is touched by
-- recompute_project_pricing()'s own writes, so this doesn't reintroduce
-- the recursion risk 0013's comment warns about.
drop trigger if exists pricing_lines_recompute on pricing_lines;
create trigger pricing_lines_recompute
  after insert or delete or update of quantity, rate, cost_type, section_id, deleted_at, is_ai_generated, ai_confirmed_at
  on pricing_lines
  for each row
  execute function app.trigger_recompute_project_pricing();
