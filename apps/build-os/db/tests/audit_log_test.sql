-- Confirms the audit_log RLS insert policy (organization member + actor
-- must equal the caller) accepts the exact write shapes lib/audit-log.ts
-- sends: a field-level update row (field_name set, scalar jsonb) and a
-- whole-row delete row (field_name null, old_value = the deleted row).
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
values ('99999999-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Audit Test', 'draft', false);

set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

insert into pricing_lines (id, organization_id, project_id, cost_type, item_code, description, quantity, rate)
values ('d1111111-0000-0000-0000-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '99999999-0000-0000-0000-000000000001', 'direct', 'D.1', 'Earthworks', 10, 100);

\echo '=== TEST 1: field-level update row is accepted by RLS ==='
insert into audit_log (organization_id, actor_user_id, table_name, record_id, action, field_name, old_value, new_value)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'pricing_lines', 'd1111111-0000-0000-0000-000000000001', 'update', 'quantity', '10'::jsonb, '20'::jsonb);
select field_name, old_value, new_value from audit_log where field_name = 'quantity';
-- EXPECT: 1 row, old_value=10, new_value=20

\echo '=== TEST 2: whole-row delete event is accepted by RLS ==='
insert into audit_log (organization_id, actor_user_id, table_name, record_id, action, field_name, old_value, new_value)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'pricing_lines', 'd1111111-0000-0000-0000-000000000001', 'delete', null, '{"item_code":"D.1","quantity":10}'::jsonb, null);
select action, field_name, old_value from audit_log where action = 'delete';
-- EXPECT: 1 row, field_name NULL, old_value the row jsonb

\echo '=== TEST 3: inserting with actor_user_id set to someone other than the caller is rejected by RLS ==='
reset role; -- creating a second real user needs elevated privilege, same as signup would use
insert into auth.users (id, email) values ('22222222-2222-2222-2222-222222222222', 'mallory@evil.test');
insert into memberships (organization_id, user_id, role, accepted_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'member', now());
set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false); -- still Alice

insert into audit_log (organization_id, actor_user_id, table_name, record_id, action, field_name, old_value, new_value)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'pricing_lines', 'd1111111-0000-0000-0000-000000000001', 'update', 'rate', '100'::jsonb, '200'::jsonb);
-- EXPECT: ERROR — new row violates row-level security policy for table "audit_log"
-- (Alice is authenticated but tried to attribute the change to Mallory.)

reset role;
