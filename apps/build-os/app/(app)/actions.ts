"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { setCurrentOrgIdCookie } from "@/lib/current-org";

export async function switchOrganization(orgId: string) {
  await setCurrentOrgIdCookie(orgId);
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// NOTE: this only creates the pending `memberships` row — it does not
// send the invitee anything. With the "pending invite by email" model
// (2a), there's nothing to send: the invitee isn't a Supabase Auth user
// yet, so there's no account to email an invite link *to*. They need to
// be told out-of-band (Slack, verbally, whatever) to sign up with that
// exact email address; accept_pending_invites() picks the pending
// membership up automatically the moment they do. Supabase's built-in
// sender (the 4th decision) still fires on its own for the signup
// confirmation email itself — nothing extra to wire up for that.
export async function inviteTeammate(_prevState: { error?: string; success?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const organizationId = String(formData.get("organization_id") ?? "");

  if (!email || !organizationId) {
    return { error: "Missing email or organization." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("memberships")
    .insert({ organization_id: organizationId, invited_email: email, invited_at: new Date().toISOString(), role: "member" });

  if (error) {
    // Most likely the partial-unique-index guard in 0002_tenancy.sql
    // (memberships_org_pending_email_idx) — that email already has a
    // pending invite in this org.
    return { error: error.message.includes("duplicate") ? "That email already has a pending invite." : error.message };
  }

  revalidatePath("/organization");
  return { success: `Invited ${email}.` };
}
