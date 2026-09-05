-- Build OS — 0012: project creation with resource-library copy-by-value
--
-- Spec 2.3: "Project Resource Library — resources copied from company
-- library for this project ... copied by value at project creation, so
-- later edits to the company library do not retroactively change a
-- priced project." A plain client-side INSERT into `projects` followed
-- by separate INSERTs into project_resources/project_assemblies would
-- work under RLS (unlike organization creation, an existing org member
-- creating a project isn't locking themselves out of anything) — but
-- doing the copy as a second round-trip from the client risks a project
-- existing with an incomplete or missing resource snapshot if the
-- client dies or errors between the two calls. One function, one
-- transaction.

create or replace function public.create_project(
  p_organization_id text,
  p_name             text,
  p_client           text default null,
  p_industry         text default null,
  p_location         text default null,
  p_project_size     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id     uuid := p_organization_id::uuid;
  v_project_id uuid;
begin
  if not app.is_org_member(v_org_id) then
    raise exception 'create_project: not a member of this organization';
  end if;

  insert into projects (organization_id, name, client, industry, location, project_size, status, is_sample)
  values (v_org_id, p_name, p_client, p_industry, p_location, p_project_size::project_size, 'draft', false)
  returning id into v_project_id;

  -- Copy-by-value: base resources.
  insert into project_resources (organization_id, project_id, source_resource_id, resource_type, description, unit, rate_or_value, comments)
  select v_org_id, v_project_id, r.id, r.resource_type, r.description, r.unit, r.rate_or_value, r.comments
  from resources r
  where r.organization_id = v_org_id;

  -- Copy-by-value: assemblies, and their components re-pointed at the
  -- newly-copied project_resources rows (not the org-level resources —
  -- see 0006's header comment on why project_assembly_components
  -- references project_resources, not resources).
  with copied_assemblies as (
    insert into project_assemblies (organization_id, project_id, source_assembly_id, name, unit, comments, derived_rate)
    select v_org_id, v_project_id, a.id, a.name, a.unit, a.comments, a.derived_rate
    from assemblies a
    where a.organization_id = v_org_id
    returning id, source_assembly_id
  ),
  resource_id_map as (
    select pr.source_resource_id as org_resource_id, pr.id as project_resource_id
    from project_resources pr
    where pr.project_id = v_project_id
  )
  insert into project_assembly_components (organization_id, project_assembly_id, component_project_resource_id, quantity_or_formula, sort_order)
  select v_org_id, ca.id, rim.project_resource_id, ac.quantity_or_formula, ac.sort_order
  from assembly_components ac
  join copied_assemblies ca on ca.source_assembly_id = ac.assembly_id
  join resource_id_map rim on rim.org_resource_id = ac.component_resource_id
  where ac.organization_id = v_org_id;

  return v_project_id;
end;
$$;

revoke all on function public.create_project(text, text, text, text, text, text) from public;
grant execute on function public.create_project(text, text, text, text, text, text) to authenticated;

comment on function public.create_project(text, text, text, text, text, text) is
  'organization_id and project_size are text, not uuid/project_size, purely
   because PostgREST''s RPC parameter binding is friendlier with text for
   enum/uuid args called from a plain JS object — cast internally instead.
   p_project_size accepts NULL or one of small/medium/large/major.';
