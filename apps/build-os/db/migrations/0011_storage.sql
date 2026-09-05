-- Build OS — 0011: object storage for project documents
--
-- Spec 8: "Object storage for documents with signed URLs." Supabase
-- Storage's `storage.objects` table is a real Postgres table with RLS
-- just like any other — so tenant isolation and the sample-project
-- read-only rule are enforced the exact same way as everywhere else in
-- this schema, via the path the app chooses to upload to rather than a
-- new mechanism.
--
-- Path convention (enforced by these policies, not just convention):
--   <organization_id>/<project_id>/<uuid>-<original_filename>
-- `storage.foldername(name)` splits the object path on '/' and returns
-- the folder segments, so foldername(name)[1] is the org id and
-- foldername(name)[2] is the project id.

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

-- Supabase enables RLS on storage.objects by default; FORCE isn't
-- available/needed here (Supabase already owns and manages this table).
alter table storage.objects enable row level security;

create policy project_documents_storage_select on storage.objects
  for select
  using (
    bucket_id = 'project-documents'
    and app.is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy project_documents_storage_insert on storage.objects
  for insert
  with check (
    bucket_id = 'project-documents'
    and app.is_org_member((storage.foldername(name))[1]::uuid)
    and app.project_is_writable((storage.foldername(name))[2]::uuid)
  );

create policy project_documents_storage_delete on storage.objects
  for delete
  using (
    bucket_id = 'project-documents'
    and app.is_org_member((storage.foldername(name))[1]::uuid)
    and app.project_is_writable((storage.foldername(name))[2]::uuid)
  );

-- No update policy: documents are replaced by deleting and re-uploading,
-- not edited in place.
