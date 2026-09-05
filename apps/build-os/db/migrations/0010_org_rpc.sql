-- Build OS — 0010: organization creation + sample-project seeding RPC
--
-- Called from the app via `supabase.rpc('create_organization_with_owner', ...)`
-- right after a new user's first sign-in with no pending invite (step 2,
-- "self-serve, auto-named org"). Must do all three inserts — org, founding
-- membership, sample project (+ its WBS/pricing content) — in one
-- transaction: a bare client-side INSERT into `organizations` would lock
-- the creator out the instant it commits, since RLS requires an existing
-- membership to read/write anything in that org (see 0009's comment on
-- why `organizations` has no INSERT policy).
--
-- These three are deliberately created in `public`, not `app`: Supabase's
-- REST API (what `supabase.rpc(...)` calls) only exposes the `public`
-- schema by default, so a function meant to be called directly from the
-- client has to live there. `app` stays reserved for the RLS-internal
-- helpers from 0009 and the auth trigger below, none of which are ever
-- called over the API directly.
--
-- Relies on being created by a role that bypasses RLS (BYPASSRLS or table
-- ownership without FORCE, though these tables use FORCE — so BYPASSRLS
-- specifically). On Supabase, migrations run as a superuser-equivalent
-- role, so this holds without extra setup; if applying by hand as a
-- non-superuser role, grant it BYPASSRLS first.

create or replace function public.create_organization_with_owner(
  p_org_name      text,
  p_currency_code char(3) default 'USD',
  p_unit_system   text default 'metric'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id  uuid;
begin
  if v_user_id is null then
    raise exception 'create_organization_with_owner: no authenticated user';
  end if;

  insert into organizations (name, currency_code, unit_system)
  values (p_org_name, p_currency_code, p_unit_system)
  returning id into v_org_id;

  insert into memberships (organization_id, user_id, role, accepted_at)
  values (v_org_id, v_user_id, 'owner', now());

  perform public.seed_sample_project(v_org_id);

  return v_org_id;
end;
$$;

-- Only authenticated users may call this (anon would have no auth.uid()
-- and the function already rejects that, but denying at the grant level
-- too is cheap and explicit).
revoke all on function public.create_organization_with_owner(text, char(3), text) from public;
grant execute on function public.create_organization_with_owner(text, char(3), text) to authenticated;

-- ---------------------------------------------------------------------
-- Sample project seed. Deliberately modest — enough to be recognizable
-- and to give steps 4-7 real rows to render against as their UIs land,
-- not an attempt to reproduce the reference screenshots' exact numbers.
-- Callable standalone (e.g. a future "restore sample project" action),
-- which is why it's a separate function from the org-creation one above.
-- ---------------------------------------------------------------------
create or replace function public.seed_sample_project(p_org_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id      uuid;
  v_prelim_section  uuid;
  v_earthworks_section uuid;
  v_wbs_prelim      uuid;
begin
  insert into projects (
    organization_id, name, client, industry, location, project_size,
    status, is_sample
  ) values (
    p_org_id, 'Commercial Construction Project', 'ABC Developer', 'Commercial',
    'Melbourne, Australia', 'large', 'estimate_analyzed', true
  )
  returning id into v_project_id;

  -- WBS: one section, a couple of packages, mirroring the brief's own
  -- "Preliminaries" example.
  insert into wbs_sections (organization_id, project_id, name, sort_order)
  values (p_org_id, v_project_id, 'Preliminaries', 1)
  returning id into v_wbs_prelim;

  insert into wbs_packages (
    organization_id, project_id, section_id, name, description,
    package_code, delivery_method, procurement_status, sort_order
  ) values
    (p_org_id, v_project_id, v_wbs_prelim, 'Site Facilities',
     'Temporary offices, amenities', '220', 'self_perform', 'not_applicable', 1),
    (p_org_id, v_project_id, v_wbs_prelim, 'Design Services',
     'Architectural and engineering', '210', 'subcontract', 'awarded', 2),
    (p_org_id, v_project_id, v_wbs_prelim, 'Project Management',
     'PM, supervision, administration', '230', 'self_perform', 'not_applicable', 3);

  -- Pricing: two direct-cost sections with one line each, plus markup
  -- settings. Sell prices are intentionally left NULL here (0 rows
  -- computed) rather than hand-computed — that's the pricing engine's
  -- job (step 5), not the seed script's.
  insert into pricing_sections (organization_id, project_id, cost_type, name, sort_order)
  values (p_org_id, v_project_id, 'direct', 'Preliminaries', 1)
  returning id into v_prelim_section;

  insert into pricing_sections (organization_id, project_id, cost_type, name, sort_order)
  values (p_org_id, v_project_id, 'direct', 'Earthworks', 2)
  returning id into v_earthworks_section;

  insert into pricing_lines (
    organization_id, project_id, section_id, cost_type, item_code,
    description, quantity, unit, rate, line_total, sort_order
  ) values
    (p_org_id, v_project_id, v_prelim_section, 'direct', '1',
     'Preliminaries', 8, 'weeks', 31862.50, 8 * 31862.50, 1),
    (p_org_id, v_project_id, v_earthworks_section, 'direct', '2.1',
     'Earthworks', 5000, 'm3', 26.13, 5000 * 26.13, 2);

  insert into markup_settings (organization_id, project_id, margin_pct, risk_pct, corporate_overheads_pct, formula_mode)
  values (p_org_id, v_project_id, 10, 2, 2, 'compounding');

  return v_project_id;
end;
$$;

revoke all on function public.seed_sample_project(uuid) from public;
grant execute on function public.seed_sample_project(uuid) to authenticated;

comment on function public.seed_sample_project(uuid) is
  'Idempotency note: calling this twice for the same org creates a second
   sample project rather than replacing the first. Fine for the
   create_organization_with_owner call site (one org, one call, ever);
   guard against double-seeding yourself if this is ever exposed as a
   user-triggered action.';

-- ---------------------------------------------------------------------
-- public.users profile row, auto-created on signup.
--
-- Without this, `users` (and therefore `memberships`, which FKs to it)
-- never gets populated at all — Supabase only creates the `auth.users`
-- row on signup, the public-schema profile table is entirely our own and
-- nothing fills it in unless we do. Standard Supabase pattern: a trigger
-- on `auth.users` insert. Lives in `app`, not `public`, since triggers
-- fire via the Postgres trigger mechanism directly and are never called
-- over the REST API — no exposure needed.
-- ---------------------------------------------------------------------
create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- Pending-invite acceptance: called right after a user's first
-- successful sign-in (any sign-in, actually — cheap and idempotent) to
-- backfill any membership rows that were invited by their email before
-- they had an account. See STEP2_PLAN.md 2a. In `public` — called
-- directly from the client via supabase.rpc(), same reasoning as the two
-- functions above.
--
-- Reads the email from auth.users directly (not the public.users profile
-- copy) so this doesn't depend on the trigger above having already run
-- in the same transaction.
-- ---------------------------------------------------------------------
create or replace function public.accept_pending_invites()
returns setof uuid  -- organization_ids newly accepted, if any
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email   citext;
begin
  if v_user_id is null then
    raise exception 'accept_pending_invites: no authenticated user';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    return;
  end if;

  return query
  update memberships
  set user_id = v_user_id,
      accepted_at = now(),
      updated_at = now()
  where invited_email = v_email
    and user_id is null
    and deleted_at is null
  returning organization_id;
end;
$$;

revoke all on function public.accept_pending_invites() from public;
grant execute on function public.accept_pending_invites() to authenticated;
