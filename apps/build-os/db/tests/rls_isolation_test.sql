-- RLS isolation test — run after applying db/dev/0000_supabase_local_stub.sql
-- and all of db/migrations/*.sql against a scratch database.
--
--   createdb buildos_test
--   psql -d buildos_test -f db/dev/0000_supabase_local_stub.sql
--   for f in db/migrations/*.sql; do psql -v ON_ERROR_STOP=1 -d buildos_test -f "$f"; done
--   psql -d buildos_test -f db/tests/rls_isolation_test.sql
--   dropdb buildos_test   # this test's inserts are not idempotent
--
-- Every "expect" below was verified against Postgres 16 on 2026-09-05.
-- Intentionally no ON_ERROR_STOP: test 7 is expected to raise, and the
-- script should keep going afterward to run test 8.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user login;
  end if;
end $$;

grant usage on schema public, app to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant execute on all functions in schema app to app_user;

-- --- Seed as the invoking (superuser/owner) role, bypasses RLS --------
-- Inserting into auth.users fires the on_auth_user_created trigger
-- (migration 0010), which creates the matching public.users row itself —
-- no separate insert into `users` needed (and doing one would now
-- conflict on the primary key).
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@acme.test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@beta.test');

insert into organizations (id, name) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Construction'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beta Builders');

insert into memberships (organization_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'owner');

insert into projects (id, organization_id, name, is_sample) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Real Project', false),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Sample Project', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beta Real Project', false);

insert into pricing_lines (organization_id, project_id, cost_type, item_code, description, quantity, rate)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'direct', '1', 'Acme real line', 10, 100),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'direct', '1', 'Acme sample line', 10, 100),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'direct', '1', 'Beta real line', 10, 100);

\echo '=== TEST 1: cross-tenant isolation (Alice, Acme owner, querying projects) — expect Acme Real + Acme Sample only ==='
set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select name, organization_id from projects order by name;

\echo '=== TEST 2: cross-tenant isolation on pricing_lines — expect the two Acme lines only, no Beta line ==='
select description from pricing_lines order by description;

\echo '=== TEST 3: sample project content is readable — expect "Acme sample line" ==='
select description from pricing_lines where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

\echo '=== TEST 4: sample project is NOT writable — expect UPDATE 0, name unchanged ==='
update projects set name = 'Hacked Sample Name' where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
select name from projects where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

\echo '=== TEST 5: sample project child rows are NOT writable — expect UPDATE 0, rate unchanged (100) ==='
update pricing_lines set rate = 99999 where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
select rate from pricing_lines where project_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

\echo '=== TEST 6: real (non-sample) project IS writable — expect UPDATE 1, rate now 250 ==='
update pricing_lines set rate = 250 where project_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
select rate from pricing_lines where project_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

\echo '=== TEST 7: Alice cannot insert into Betas real project — expect an RLS ERROR (that is the pass condition) ==='
insert into pricing_lines (organization_id, project_id, cost_type, item_code, description, quantity, rate)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'direct', '2', 'Injected by Alice', 1, 1);

\echo '=== TEST 8: switch to Bob — expect only "Beta Real Project" ==='
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select name from projects order by name;

reset role;
