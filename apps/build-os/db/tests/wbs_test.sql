-- Tests the WBS/procurement schema from 0005_wbs.sql (step 6's UI is
-- built on top of this, unchanged since step 1). Run after
-- db/dev/0000_supabase_local_stub.sql and all of db/migrations/*.sql
-- against a scratch database.

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
values ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'WBS Test', 'draft', false);

set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into pricing_sections (id, organization_id, project_id, cost_type, name)
values ('55555555-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 'direct', 'Earthworks');
insert into pricing_lines (organization_id, project_id, section_id, cost_type, item_code, description, quantity, rate)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', '55555555-0000-0000-0000-000000000001', 'direct', '1.1', 'Site clearance', 10, 100);

insert into wbs_sections (id, organization_id, project_id, name)
values ('66666666-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 'Preliminaries');

\echo '=== TEST 1: a package linked to a pricing section can be created ==='
insert into wbs_packages (id, organization_id, project_id, section_id, name, package_code, delivery_method, procurement_status, pricing_section_id)
values ('77777777-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'Earthworks Package', '110', 'subcontract', 'draft', '55555555-0000-0000-0000-000000000001');
select name, package_code, procurement_status from wbs_packages where id = '77777777-0000-0000-0000-000000000001';

\echo '=== TEST 2: package codes must be unique within a project ==='
do $$
begin
  insert into wbs_packages (organization_id, project_id, section_id, name, package_code)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', '66666666-0000-0000-0000-000000000001', 'Duplicate Code Package', '110');
  raise exception 'TEST 2 FAILED: duplicate package_code should have been rejected';
exception
  when unique_violation then
    raise notice 'TEST 2 PASSED: duplicate package_code correctly rejected';
end $$;

\echo '=== TEST 3: deleting a section cascades to delete its packages (0005: section_id is NOT NULL, ON DELETE CASCADE) ==='
delete from wbs_sections where id = '66666666-0000-0000-0000-000000000001';
select count(*) as should_be_0 from wbs_packages where id = '77777777-0000-0000-0000-000000000001';

reset role;
