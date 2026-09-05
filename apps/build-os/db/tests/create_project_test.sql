-- Tests public.create_project() from migration 0012: project creation
-- plus resource/assembly copy-by-value. Run after
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

insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'alice@acme.test');
insert into organizations (id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Construction');
insert into memberships (organization_id, user_id, role, accepted_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner', now());

-- Org-level resource library: 2 base resources + 1 assembly using both.
insert into resources (id, organization_id, resource_type, description, unit, rate_or_value) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'labour', 'Concrete Labour', 'mhr', 65),
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'material', 'Ready-Mix Concrete', '/m3', 220);

insert into assemblies (id, organization_id, name, unit) values
  ('22222222-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Poured Slab', 'm3');

insert into assembly_components (organization_id, assembly_id, component_resource_id, quantity_or_formula, sort_order) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '2', 1),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', '1', 2);

set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

\echo '=== TEST 1: create_project succeeds and returns a project id ==='
select public.create_project('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'New Warehouse', 'ABC Developer', 'Industrial', 'Perth', 'medium') as new_project_id \gset
select name, client, industry, location, project_size, status, is_sample from projects where id = :'new_project_id';

\echo '=== TEST 2: both org resources were copied into project_resources ==='
select description, resource_type, rate_or_value from project_resources where project_id = :'new_project_id' order by description;

\echo '=== TEST 3: the assembly was copied into project_assemblies ==='
select name, unit from project_assemblies where project_id = :'new_project_id';

\echo '=== TEST 4: the assembly components were re-pointed at the COPIED project_resources rows, not the org resources ==='
select pac.quantity_or_formula, pr.description
from project_assembly_components pac
join project_assemblies pa on pa.id = pac.project_assembly_id
join project_resources pr on pr.id = pac.component_project_resource_id
where pa.project_id = :'new_project_id'
order by pac.sort_order;

\echo '=== TEST 5: editing the ORG resource afterward does NOT change the already-copied project_resources row ==='
update resources set rate_or_value = 999 where id = '11111111-0000-0000-0000-000000000001';
select description, rate_or_value from project_resources
where project_id = :'new_project_id' and description = 'Concrete Labour';
-- EXPECT: still 65, not 999 -- this is the actual "copied by value" requirement from the brief.

reset role;
