-- Tests the workbook_templates/workbook_rows schema (0007) and the
-- integration point "apply a workbook to a project" actually depends on:
-- once a section + pricing_lines are inserted in the shape
-- applyWorkbookToProject() produces (item_code 'WB.N', quantity/rate
-- split out from the evaluator's computed_total), the pricing engine
-- (0013) must pick them up exactly like any other line. The formula
-- evaluator itself (lib/formula-evaluator.ts) is unit-tested separately
-- in scripts/verify-formula-evaluator.mjs — no DB involved there, see
-- that file's own header for why.
--
-- Run after db/dev/0000_supabase_local_stub.sql and all of
-- db/migrations/*.sql against a scratch database.

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
values ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Workbook Test', 'draft', false);

set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

\echo '=== TEST 1: workbook_templates + workbook_rows can be created and read back ==='
insert into workbook_templates (id, organization_id, name, description)
values ('88888888-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Concrete Estimation Sheet', 'Standard slab takeoff');

insert into workbook_rows (organization_id, workbook_template_id, row_type, description, sort_order)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-0000-0000-0000-000000000001', 'heading', 'Concrete Works', 0);

insert into workbook_rows (organization_id, workbook_template_id, row_type, description, unit, rate, qty_formula, sort_order)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-0000-0000-0000-000000000001', 'resource', 'Concrete Volume', 'm3', null, '10', 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-0000-0000-0000-000000000001', 'resource', 'Reinforcement Ratio', null, 0.02, null, 2),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '88888888-0000-0000-0000-000000000001', 'resource', 'Rebar Weight', 't', 7850, 'Concrete Volume * Reinforcement Ratio', 3);

select row_type, description, unit, rate, qty_formula from workbook_rows
where workbook_template_id = '88888888-0000-0000-0000-000000000001' order by sort_order;
-- EXPECT: 4 rows in sort order (heading, then the 3 resource rows above)

\echo '=== TEST 2: simulating applyWorkbookToProject — a new pricing_section + WB.N pricing_lines, evaluated exactly like the JS evaluator would (0.2m3*0.02=0.2, *7850=1570) ==='
insert into pricing_sections (id, organization_id, project_id, cost_type, name)
values ('55555555-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 'direct', 'Concrete Estimation Sheet');

insert into pricing_lines (organization_id, project_id, section_id, cost_type, item_code, description, quantity, unit, rate)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002', 'direct', 'WB.1', 'Rebar Weight', 0.2, 't', 7850);

select item_code, description, quantity, rate, line_total, sell_price from pricing_lines
where section_id = '55555555-0000-0000-0000-000000000002';
-- EXPECT: line_total=1570.000000, sell_price=1570.000000 (no markup_settings row -> defaults to 0/0/0)
-- (this is the pricing engine trigger firing on the workbook-applied line exactly as it would on any manually-entered one)

reset role;
