import { createClient } from "@/lib/supabase/server";
import { resolveCurrentOrgId } from "@/lib/current-org";
import { Badge, Card } from "@/components/ui";
import { InviteForm } from "./InviteForm";

export default async function OrganizationPage() {
  const supabase = await createClient();
  const currentOrgId = await resolveCurrentOrgId();
  if (!currentOrgId) return null;

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, user_id, role, invited_email, accepted_at")
    .eq("organization_id", currentOrgId);

  const userIds = (memberships ?? []).map((m) => m.user_id).filter((id): id is string => id !== null);

  const { data: users } =
    userIds.length > 0 ? await supabase.from("users").select("id, email").in("id", userIds) : { data: [] };

  const emailById = new Map((users ?? []).map((u) => [u.id, u.email]));

  return (
    <div>
      <h1 className="mb-1 text-heading-sm font-semibold tracking-tight text-ink">Organization</h1>
      <p className="mb-6 text-sm text-mid-gray">Manage who has access.</p>

      <Card className="mb-6">
        <InviteForm organizationId={currentOrgId} />
      </Card>

      <Card padded={false} className="overflow-hidden">
        <ul className="divide-y divide-hairline">
          {(memberships ?? []).map((m) => (
            <li key={m.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{m.user_id ? emailById.get(m.user_id) : m.invited_email}</p>
                <p className="text-xs text-mid-gray capitalize">{m.role}</p>
              </div>
              <Badge tone={m.accepted_at ? "soft" : "outline"}>{m.accepted_at ? "Accepted" : "Invited"}</Badge>
            </li>
          ))}
          {(memberships ?? []).length === 0 ? (
            <li className="px-5 py-8 text-center text-sm text-mid-gray">No members yet.</li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
