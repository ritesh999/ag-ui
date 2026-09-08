-- Tests 0014_ai_generated_line_confirmation.sql: spec 5's "every
-- AI-generated line ... requires human confirmation before it counts
-- toward a total," which 0013's first version of the pricing engine
-- never actually implemented (0004_pricing.sql documented it as the
-- engine's job, not a DB constraint). Run after
-- db/dev/0000_supabase_local_stub.sql and all of db/migrations/*.sql
-- against a scratch database.
--
-- Fixture: D.1 confirmed (qty=10, rate=100 -> 1000), D.2 is an
-- UNCONFIRMED AI suggestion (qty=5, rate=200 -> 1000 cost, but should not
-- count), IND.1 indirect (qty=1, rate=200 -> 200).
--   directTotal (excluding D.2) = 1000
--   indirectTotal = 200
--   D.1 share = 1000/1000 = 1 -> absorbed = 200 -> cost_with_indirect=1200
--   D.1 sell_price (no markup) = 1200
--   D.2: line_total=1000 (shown), absorbed_indirect=0, sell_price=NULL

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
values ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AI Line Test', 'draft', false);

set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

\echo '=== TEST 1: an unconfirmed AI-generated line shows its own cost but contributes nothing to totals ==='
insert into pricing_lines (id, organization_id, project_id, cost_type, item_code, description, quantity, rate, is_ai_generated) values
  ('d1111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 'direct', 'D.1', 'Confirmed line', 10, 100, false),
  ('d2222222-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 'direct', 'D.2', 'AI suggestion', 5, 200, true),
  ('11113333-0000-0000-0000-000000000003', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 'indirect', 'IND.1', 'Overheads', 1, 200, false);

select item_code, is_ai_generated, ai_confirmed_at is not null as confirmed, line_total, absorbed_indirect, sell_price
from pricing_lines where project_id = '99999999-0000-0000-0000-000000000001' order by item_code;
-- EXPECT: D.1 line_total=1000 absorbed_indirect=200 sell_price=1200 (the FULL 200 of indirect cost,
--         since D.2 doesn't participate in the share at all)
--         D.2 line_total=1000 absorbed_indirect=0 sell_price=NULL confirmed=f
--         IND.1 line_total=200 absorbed_indirect=0 sell_price=NULL

\echo '=== TEST 2: confirming the AI line reactively brings it into the totals, no explicit RPC call ==='
update pricing_lines set ai_confirmed_at = now() where item_code = 'D.2';

select item_code, line_total, absorbed_indirect, sell_price
from pricing_lines where project_id = '99999999-0000-0000-0000-000000000001' order by item_code;
-- EXPECT: directTotal is now 1000+1000=2000, indirectTotal=200
--         D.1 share=0.5 -> absorbed=100 -> sell_price=1100
--         D.2 share=0.5 -> absorbed=100 -> sell_price=1100
--         IND.1 unchanged (line_total=200, absorbed=0, sell_price=NULL)

reset role;
