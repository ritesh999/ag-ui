import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/types";

function autoOrgName(email: string) {
  const localPart = email.split("@")[0] || "My";
  const capitalized = localPart.charAt(0).toUpperCase() + localPart.slice(1);
  return `${capitalized}'s Organization`;
}

// Runs once right after a session is established (password login, email
// confirmation callback, or an immediately-confirmed signup). Idempotent:
// safe to call on every login, not just the first one.
//
// Order matters: accept any pending invite BEFORE deciding whether to
// create a new org, so someone who was invited before ever signing up
// lands in the org they were invited to, not a fresh empty one of their
// own (STEP2_PLAN.md 2a/2b).
export async function bootstrapUserAfterAuth(supabase: SupabaseClient<Database>) {
  await supabase.rpc("accept_pending_invites");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { count } = await supabase
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .not("user_id", "is", null);

  if (!count || count === 0) {
    const email = user.email ?? "user@example.com";
    await supabase.rpc("create_organization_with_owner", { p_org_name: autoOrgName(email) });
  }
}
