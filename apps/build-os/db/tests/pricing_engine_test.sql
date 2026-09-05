-- Tests public.recompute_project_pricing() and its triggers from migration
-- 0013. Run after db/dev/0000_supabase_local_stub.sql and all of
-- db/migrations/*.sql against a scratch database.
--
-- Fixture (all direct lines except IND.1):
--   D.1  qty=10  rate=100   -> line_total 1000
--   D.2  qty=5   rate=200   -> line_total 1000
--   IND.1 qty=1  rate=400   -> line_total 400  (indirect)
-- directTotal = 2000, indirectTotal = 400
--   D.1 share = 1000/2000 = 0.5  -> absorbed = 200 -> costWithIndirect = 1200
--   D.2 share = 1000/2000 = 0.5  -> absorbed = 200 -> costWithIndirect = 1200
-- markup_settings: margin=10%, risk=2%, overheads=2%, formula_mode=compounding
--   multiplier = 1.10 * 1.02 * 1.02 = 1.144440
--   D.1 sell = 1200 * 1.144440 = 1373.328000
--   D.2 sell = 1200 * 1.144440 = 1373.328000
--   IND.1: line_total 400, absorbed_indirect 0, sell_price NULL

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user login in role authenticated;
  end if;
end $$;

grant usage on schema public, app to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant execute on all functions in schema app to app_user;
grant execute on all functions in schema public to app_user;

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'alice@acme.test');
insert into organizations (id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Construction');
insert into memberships (organization_id, user_id, role, accepted_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner', now());

insert into projects (id, organization_id, name, status, is_sample)
values ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pricing Test Project', 'draft', false);

set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

\echo '=== TEST 1: inserting pricing lines with no markup_settings row defaults to 0/0/0 compounding (no-op multiplier) ==='
insert into pricing_lines (id, organization_id, project_id, cost_type, item_code, description, quantity, rate) values
  ('d1111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 'direct', 'D.1', 'Earthworks', 10, 100),
  ('d2222222-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 'direct', 'D.2', 'Concrete', 5, 200),
  ('11113333-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 'indirect', 'IND.1', 'Site Establishment', 1, 400);

select item_code, line_total, absorbed_indirect, sell_price
from pricing_lines where project_id = '99999999-0000-0000-0000-000000000001' order by item_code;
-- EXPECT: D.1 line_total=1000.000000 absorbed_indirect=200.000000 sell_price=1200.000000
--         D.2 line_total=1000.000000 absorbed_indirect=200.000000 sell_price=1200.000000
--         IND.1 line_total=400.000000 absorbed_indirect=0.000000 sell_price=NULL

\echo '=== TEST 2: adding markup_settings (10/2/2, compounding) reactively recomputes sell_price with no explicit RPC call ==='
insert into markup_settings (organization_id, project_id, margin_pct, risk_pct, corporate_overheads_pct, formula_mode)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 10, 2, 2, 'compounding');

select item_code, line_total, absorbed_indirect, sell_price
from pricing_lines where project_id = '99999999-0000-0000-0000-000000000001' order by item_code;
-- EXPECT: D.1 sell_price=1373.328000  D.2 sell_price=1373.328000  IND.1 sell_price=NULL (unchanged cost fields)

\echo '=== TEST 3: editing a direct line quantity reactively re-shares indirect cost and re-prices, no explicit RPC call ==='
update pricing_lines set quantity = 20 where item_code = 'D.1';
-- New: D.1 line_total=2000, D.2 line_total=1000. directTotal=3000, indirectTotal=400.
-- D.1 share = 2000/3000 = 0.666667 -> absorbed = 266.666800 (rounded to 6dp) -> costWithIndirect = 2266.666800
-- D.2 share = 1000/3000 = 0.333333 -> absorbed = 133.333200 -> costWithIndirect = 1133.333200
select item_code, line_total, absorbed_indirect
from pricing_lines where project_id = '99999999-0000-0000-0000-000000000001' order by item_code;
-- EXPECT: D.1 line_total=2000.000000 absorbed_indirect=266.666800 (approx, share*400)
--         D.2 line_total=1000.000000 absorbed_indirect=133.333200 (approx)

\echo '=== TEST 4: switching formula_mode to additive reactively re-prices using the additive formula ==='
update markup_settings set formula_mode = 'additive' where project_id = '99999999-0000-0000-0000-000000000001';
-- additive multiplier = 1 + (0.10+0.02+0.02) = 1.14
select item_code, sell_price, round(absorbed_indirect + line_total, 6) as cost_with_indirect,
  round((absorbed_indirect + line_total) * 1.14, 6) as expected_sell
from pricing_lines where project_id = '99999999-0000-0000-0000-000000000001' and cost_type = 'direct' order by item_code;
-- EXPECT: sell_price column matches expected_sell column exactly, for both rows

\echo '=== TEST 5: divide-by-zero guard — deleting all direct lines leaves indirect lines priced with zero share, no error ==='
update markup_settings set formula_mode = 'compounding' where project_id = '99999999-0000-0000-0000-000000000001';
delete from pricing_lines where cost_type = 'direct' and project_id = '99999999-0000-0000-0000-000000000001';
select item_code, line_total, absorbed_indirect, sell_price
from pricing_lines where project_id = '99999999-0000-0000-0000-000000000001';
-- EXPECT: IND.1 line_total=400.000000 absorbed_indirect=0.000000 sell_price=NULL, no error raised

\echo '=== TEST 6: recompute_project_pricing rejects a non-member (RLS-equivalent authorization check inside the function) ==='
reset role;
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'mallory@evil.test');
set role app_user;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select public.recompute_project_pricing('99999999-0000-0000-0000-000000000001');
-- EXPECT: ERROR: recompute_project_pricing: not a member of this organization

reset role;
