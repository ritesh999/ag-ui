import "server-only";
import { cookies } from "next/headers";
import { createClient } from "./supabase/server";

const CURRENT_ORG_COOKIE = "current_org_id";

export interface UserOrganization {
  id: string;
  name: string;
  role: "owner" | "admin" | "member" | "viewer";
}

// Cookie-based "current org" (per STEP2_PLAN.md 3: plain /projects URLs,
// the active org lives in a cookie the org switcher sets).
export async function getUserOrganizations(): Promise<UserOrganization[]> {
  const supabase = await createClient();

  // Two plain queries rather than a PostgREST embedded select
  // (`organizations(id,name)`) — the hand-written Database type in
  // lib/supabase/types.ts doesn't carry relationship metadata, so an
  // embedded select wouldn't type-check cleanly. Revisit once real
  // generated types exist (see that file's header comment).
  const { data: memberships, error: membershipsError } = await supabase
    .from("memberships")
    .select("organization_id, role")
    .not("user_id", "is", null);

  if (membershipsError || !memberships || memberships.length === 0) return [];

  const orgIds = memberships.map((m) => m.organization_id);
  const { data: organizations, error: orgsError } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds);

  if (orgsError || !organizations) return [];

  const nameById = new Map(organizations.map((o) => [o.id, o.name]));

  return memberships
    .filter((m) => nameById.has(m.organization_id))
    .map((m) => ({ id: m.organization_id, name: nameById.get(m.organization_id)!, role: m.role }));
}

// Resolves which org should be "active" for this request: the cookie's
// value if it's one the user actually belongs to, otherwise their first
// org. Does NOT write the cookie itself (Server Components can't set
// cookies) — callers that need the fallback persisted should use
// setCurrentOrgId from a Server Action once the user picks or lands on
// one, e.g. in the org switcher.
export async function resolveCurrentOrgId(orgs?: UserOrganization[]): Promise<string | null> {
  const organizations = orgs ?? (await getUserOrganizations());
  if (organizations.length === 0) return null;

  const cookieStore = await cookies();
  const cookieOrgId = cookieStore.get(CURRENT_ORG_COOKIE)?.value;

  if (cookieOrgId && organizations.some((o) => o.id === cookieOrgId)) {
    return cookieOrgId;
  }

  return organizations[0].id;
}

export async function setCurrentOrgIdCookie(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ORG_COOKIE, orgId, {
    path: "/",
    httpOnly: false, // read by the org switcher client component for optimistic UI
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
}
