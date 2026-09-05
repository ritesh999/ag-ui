-- Tests the storage.objects RLS policies from 0011_storage.sql. Run after
-- db/dev/0000_supabase_local_stub.sql and all of db/migrations/*.sql
-- against a scratch database.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user login;
  end if;
end $$;

grant usage on schema public, storage to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant select, insert, update, delete on storage.objects to app_user;
grant execute on all functions in schema app to app_user;

-- --- Seed as the invoking (superuser/owner) role, bypasses RLS --------
insert into auth.users (id, email) values ('11111111-1111-1111-1111-111111111111', 'alice@acme.test');
insert into organizations (id, name) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Construction');
insert into memberships (organization_id, user_id, role, accepted_at)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner', now());
insert into projects (id, organization_id, name, is_sample) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Real Project', false),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Sample Project', true);

-- A second, unrelated org + project Alice has no membership in.
insert into organizations (id, name) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beta Builders');
insert into projects (id, organization_id, name, is_sample) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beta Real Project', false);

set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

\echo '=== TEST 1: Alice can upload to her own real project ==='
insert into storage.objects (bucket_id, name)
values ('project-documents', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cccccccc-cccc-cccc-cccc-cccccccccccc/scope.pdf');
select count(*) as should_be_1 from storage.objects
where name = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/cccccccc-cccc-cccc-cccc-cccccccccccc/scope.pdf';

\echo '=== TEST 2: Alice CANNOT upload into the sample project ==='
insert into storage.objects (bucket_id, name)
values ('project-documents', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/dddddddd-dddd-dddd-dddd-dddddddddddd/hack.pdf');
-- EXPECT: ERROR — RLS policy violation (this is the pass condition).

\echo '=== TEST 3: Alice CANNOT upload into Betas project (not her org) ==='
insert into storage.objects (bucket_id, name)
values ('project-documents', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/hack.pdf');
-- EXPECT: ERROR — RLS policy violation.

reset role;

-- Seed a document in Beta's project directly (bypassing RLS, as owner).
insert into storage.objects (bucket_id, name)
values ('project-documents', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee/beta-doc.pdf');

set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

\echo '=== TEST 4: Alice cannot SEE Betas document ==='
select count(*) as should_be_0 from storage.objects where name like 'bbbbbbbb%';

\echo '=== TEST 5: Alice CAN see her own uploaded document ==='
select count(*) as should_be_1 from storage.objects where name like 'aaaaaaaa%';

reset role;

-- Seed a document directly into the sample project (bypassing RLS).
insert into storage.objects (bucket_id, name)
values ('project-documents', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/dddddddd-dddd-dddd-dddd-dddddddddddd/sample-doc.pdf');

set role app_user;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

\echo '=== TEST 6: Alice cannot delete a document from the (read-only) sample project ==='
delete from storage.objects where name like '%sample-doc.pdf';
select count(*) as should_still_be_1 from storage.objects where name like '%sample-doc.pdf';

reset role;
