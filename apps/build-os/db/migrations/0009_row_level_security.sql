-- Build OS — 0009: row-level security
--
-- Spec 6: "Row-level security scoped by organisation. No query may cross
-- tenants." and "Sample/demo records flagged and read-only at the data
-- layer, not just in the UI."
--
-- Assumption carried from 0001: `auth.uid()` exists (Supabase Auth). If a
-- different auth provider is chosen in step 2, only `app.current_user_id()`
-- below needs to change — every policy in this file calls that function
-- rather than `auth.uid()` directly, specifically so this swap is
-- localized to one place.

create schema if not exists app;

create or replace function app.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;

-- True if the current user has an accepted (user_id is set), non-deleted
-- membership in the given organization. SECURITY DEFINER so it can read
-- `memberships` even from inside another table's RLS-restricted query
-- plan without the caller separately needing a SELECT grant on
-- memberships for every check.
create or replace function app.is_org_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.organization_id = p_organization_id
      and m.user_id = app.current_user_id()
      and m.deleted_at is null
  );
$$;

create or replace function app.is_org_admin(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from memberships m
    where m.organization_id = p_organization_id
      and m.user_id = app.current_user_id()
      and m.role in ('owner', 'admin')
      and m.deleted_at is null
  );
$$;

-- True if the given project may be written to: it belongs to an org the
-- current user is a member of, is not soft-deleted, and is not the
-- read-only sample project. Used by every project-child table's
-- INSERT/UPDATE/DELETE policy; SELECT policies deliberately do NOT use
-- this (sample project content must stay readable, only writes are
-- blocked).
create or replace function app.project_is_writable(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    where p.id = p_project_id
      and p.deleted_at is null
      and p.is_sample = false
      and app.is_org_member(p.organization_id)
  );
$$;

-- =======================================================================
-- organizations
-- =======================================================================
alter table organizations enable row level security;
alter table organizations force row level security;

create policy organizations_select on organizations
  for select using (app.is_org_member(id));

-- NOTE: no INSERT policy here on purpose. Creating an organization has to
-- also create the founding membership row (as 'owner') in the same
-- transaction, or the creator would be locked out by RLS the instant the
-- INSERT commits. Recommend a SECURITY DEFINER `create_organization(name)`
-- RPC function in step 2 that does both inserts atomically, rather than a
-- bare client-side INSERT policy on this table. Flagged in
-- SCHEMA_REVIEW.md.

create policy organizations_update on organizations
  for update
  using (app.is_org_admin(id))
  with check (app.is_org_admin(id));

-- =======================================================================
-- users
-- =======================================================================
alter table users enable row level security;
alter table users force row level security;

-- A user can see their own profile, plus the profiles of anyone who
-- shares at least one organization with them (needed for team rosters,
-- "created_by" attribution, etc.).
create policy users_select on users
  for select using (
    id = app.current_user_id()
    or exists (
      select 1
      from memberships mine
      join memberships theirs on theirs.organization_id = mine.organization_id
      where mine.user_id = app.current_user_id()
        and mine.deleted_at is null
        and theirs.user_id = users.id
        and theirs.deleted_at is null
    )
  );

create policy users_update_self on users
  for update
  using (id = app.current_user_id())
  with check (id = app.current_user_id());

-- =======================================================================
-- memberships
-- =======================================================================
alter table memberships enable row level security;
alter table memberships force row level security;

create policy memberships_select on memberships
  for select using (app.is_org_member(organization_id));

create policy memberships_write on memberships
  for all
  using (app.is_org_admin(organization_id))
  with check (app.is_org_admin(organization_id));

-- =======================================================================
-- projects
-- =======================================================================
alter table projects enable row level security;
alter table projects force row level security;

create policy projects_select on projects
  for select using (app.is_org_member(organization_id));

create policy projects_insert on projects
  for insert with check (app.is_org_member(organization_id) and is_sample = false);
  -- Clients can never insert a row with is_sample = true; that flag is
  -- set only by the seeding routine in step 2.

create policy projects_update on projects
  for update
  using (app.is_org_member(organization_id) and is_sample = false)
  with check (app.is_org_member(organization_id) and is_sample = false);

create policy projects_delete on projects
  for delete using (app.is_org_member(organization_id) and is_sample = false);

-- =======================================================================
-- Generic shape for every project-child table below:
--   SELECT             -> org member (sample project content stays visible)
--   INSERT/UPDATE/DELETE -> org member AND app.project_is_writable(project_id)
-- =======================================================================

-- --- project_documents --------------------------------------------------
alter table project_documents enable row level security;
alter table project_documents force row level security;

create policy project_documents_select on project_documents
  for select using (app.is_org_member(organization_id));

create policy project_documents_write on project_documents
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

-- --- wbs_sections / wbs_packages ----------------------------------------
alter table wbs_sections enable row level security;
alter table wbs_sections force row level security;

create policy wbs_sections_select on wbs_sections
  for select using (app.is_org_member(organization_id));

create policy wbs_sections_write on wbs_sections
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

alter table wbs_packages enable row level security;
alter table wbs_packages force row level security;

create policy wbs_packages_select on wbs_packages
  for select using (app.is_org_member(organization_id));

create policy wbs_packages_write on wbs_packages
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

-- --- pricing_sections / pricing_lines / markup_settings ------------------
alter table pricing_sections enable row level security;
alter table pricing_sections force row level security;

create policy pricing_sections_select on pricing_sections
  for select using (app.is_org_member(organization_id));

create policy pricing_sections_write on pricing_sections
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

alter table pricing_lines enable row level security;
alter table pricing_lines force row level security;

create policy pricing_lines_select on pricing_lines
  for select using (app.is_org_member(organization_id));

create policy pricing_lines_write on pricing_lines
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

alter table markup_settings enable row level security;
alter table markup_settings force row level security;

create policy markup_settings_select on markup_settings
  for select using (app.is_org_member(organization_id));

create policy markup_settings_write on markup_settings
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

-- --- project_resources / project_assemblies / project_assembly_components
alter table project_resources enable row level security;
alter table project_resources force row level security;

create policy project_resources_select on project_resources
  for select using (app.is_org_member(organization_id));

create policy project_resources_write on project_resources
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

alter table project_assemblies enable row level security;
alter table project_assemblies force row level security;

create policy project_assemblies_select on project_assemblies
  for select using (app.is_org_member(organization_id));

create policy project_assemblies_write on project_assemblies
  for all
  using (app.is_org_member(organization_id) and app.project_is_writable(project_id))
  with check (app.is_org_member(organization_id) and app.project_is_writable(project_id));

alter table project_assembly_components enable row level security;
alter table project_assembly_components force row level security;

create policy project_assembly_components_select on project_assembly_components
  for select using (app.is_org_member(organization_id));

-- This table has no project_id of its own — reach it via its parent
-- project_assembly row.
create policy project_assembly_components_write on project_assembly_components
  for all
  using (
    app.is_org_member(organization_id)
    and exists (
      select 1 from project_assemblies pa
      where pa.id = project_assembly_components.project_assembly_id
        and app.project_is_writable(pa.project_id)
    )
  )
  with check (
    app.is_org_member(organization_id)
    and exists (
      select 1 from project_assemblies pa
      where pa.id = project_assembly_components.project_assembly_id
        and app.project_is_writable(pa.project_id)
    )
  );

-- =======================================================================
-- Org-level library — no sample-project concept, plain membership CRUD
-- =======================================================================

alter table resources enable row level security;
alter table resources force row level security;
create policy resources_select on resources for select using (app.is_org_member(organization_id));
create policy resources_write on resources for all
  using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table assemblies enable row level security;
alter table assemblies force row level security;
create policy assemblies_select on assemblies for select using (app.is_org_member(organization_id));
create policy assemblies_write on assemblies for all
  using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table assembly_components enable row level security;
alter table assembly_components force row level security;
create policy assembly_components_select on assembly_components for select using (app.is_org_member(organization_id));
create policy assembly_components_write on assembly_components for all
  using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table workbook_templates enable row level security;
alter table workbook_templates force row level security;
create policy workbook_templates_select on workbook_templates for select using (app.is_org_member(organization_id));
create policy workbook_templates_write on workbook_templates for all
  using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

alter table workbook_rows enable row level security;
alter table workbook_rows force row level security;
create policy workbook_rows_select on workbook_rows for select using (app.is_org_member(organization_id));
create policy workbook_rows_write on workbook_rows for all
  using (app.is_org_member(organization_id)) with check (app.is_org_member(organization_id));

-- =======================================================================
-- document_categories — global fixed lookup, readable by anyone
-- authenticated, writable only via migrations/service role (no policy).
-- =======================================================================
alter table document_categories enable row level security;
alter table document_categories force row level security;

create policy document_categories_select on document_categories
  for select using (app.current_user_id() is not null);

-- =======================================================================
-- audit_log — append-only
-- =======================================================================
alter table audit_log enable row level security;
alter table audit_log force row level security;

create policy audit_log_select on audit_log
  for select using (app.is_org_member(organization_id));

create policy audit_log_insert on audit_log
  for insert with check (
    app.is_org_member(organization_id)
    and actor_user_id = app.current_user_id()
  );

-- No update/delete policy for any role: rows are immutable once written.
