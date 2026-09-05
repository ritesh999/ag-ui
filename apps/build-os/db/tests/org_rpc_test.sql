-- Tests public.create_organization_with_owner / seed_sample_project /
-- accept_pending_invites, from migration 0010. Run after
-- db/dev/0000_supabase_local_stub.sql and all of db/migrations/*.sql
-- against a scratch database (same setup as rls_isolation_test.sql).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user login in role authenticated;
  end if;
end $$;

grant usage on schema public, app to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant execute on all functions in schema app to app_user;

\echo '=== TEST 1: signup trigger creates a public.users profile row ==='
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@acme.test');
select id, email from users where id = '11111111-1111-1111-1111-111111111111';
-- EXPECT: one row — the trigger should have fired automatically.

set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

\echo '=== TEST 2: create_organization_with_owner creates org + owner membership + sample project, atomically ==='
select public.create_organization_with_owner('Acme Construction') as new_org_id \gset

select role, accepted_at is not null as accepted from memberships
where organization_id = :'new_org_id' and user_id = '11111111-1111-1111-1111-111111111111';
-- EXPECT: role = owner, accepted = true

select name, is_sample, status from projects where organization_id = :'new_org_id';
-- EXPECT: one row, 'Commercial Construction Project', is_sample = true

select count(*) as wbs_package_count from wbs_packages
where project_id in (select id from projects where organization_id = :'new_org_id');
-- EXPECT: 3

select count(*) as pricing_line_count from pricing_lines
where project_id in (select id from projects where organization_id = :'new_org_id');
-- EXPECT: 2

select margin_pct, risk_pct, corporate_overheads_pct, formula_mode from markup_settings
where project_id in (select id from projects where organization_id = :'new_org_id');
-- EXPECT: 10, 2, 2, compounding

\echo '=== TEST 3: the new org is actually visible under RLS (not locked out by its own creation) ==='
select name from organizations where id = :'new_org_id';
-- EXPECT: 'Acme Construction' — this is the real regression test for the
-- "bare INSERT would lock the creator out" problem 0009/0010 call out.

reset role;

\echo '=== TEST 4: pending invite gets backfilled on accept_pending_invites ==='
-- Bob is invited to Acme (by email) before he has ever signed up.
insert into memberships (organization_id, user_id, role, invited_email, invited_at)
values (:'new_org_id', null, 'member', 'bob@beta.test', now());

-- Bob signs up (fires the trigger, creating his public.users row).
insert into auth.users (id, email) values
  ('22222222-2222-2222-2222-222222222222', 'bob@beta.test');

set role app_user;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select * from public.accept_pending_invites();
-- EXPECT: one row — the org_id Bob was just accepted into.

select user_id, accepted_at is not null as accepted, invited_email from memberships
where organization_id = :'new_org_id' and invited_email = 'bob@beta.test';
-- EXPECT: user_id backfilled to Bob's id, accepted = true.

\echo '=== TEST 5: Bob can now see the org he was just accepted into ==='
select name from organizations where id = :'new_org_id';
-- EXPECT: 'Acme Construction'

\echo '=== TEST 6: calling accept_pending_invites again is a harmless no-op ==='
select * from public.accept_pending_invites();
-- EXPECT: 0 rows (nothing left to accept).

reset role;
