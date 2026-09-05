import { MapPin, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveCurrentOrgId } from "@/lib/current-org";
import { Badge, Card } from "@/components/ui";

// Deliberately minimal — a real "Create Project" modal, the project
// detail tabs (Overview / Subcontractors / Estimate), document upload,
// etc. are steps 3-7. This page exists to prove step 2's actual job: a
// fresh org already has its read-only sample project the moment you land
// here.
export default async function ProjectsPage() {
  const supabase = await createClient();
  const currentOrgId = await resolveCurrentOrgId();
  if (!currentOrgId) return null;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, client, location, industry, is_sample, status")
    .eq("organization_id", currentOrgId);

  return (
    <div>
      <h1 className="mb-1 text-heading-sm font-semibold tracking-tight text-ink">Projects</h1>
      <p className="mb-6 text-sm text-mid-gray">Manage your projects below.</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(projects ?? []).map((p) => (
          <Card key={p.id}>
            <h3 className="mb-1 text-lg font-semibold text-ink">{p.name}</h3>
            <p className="mb-2 text-sm text-mid-gray">{p.client}</p>
            <p className="mb-1 flex items-center gap-1.5 text-sm text-mid-gray">
              <MapPin className="h-3.5 w-3.5" />
              {p.location}
            </p>
            <p className="mb-3 flex items-center gap-1.5 text-sm text-mid-gray">
              <Building2 className="h-3.5 w-3.5" />
              {p.industry}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {p.is_sample ? <Badge tone="solid">Sample Project</Badge> : null}
              <Badge tone="soft">{p.status.replace(/_/g, " ")}</Badge>
            </div>
          </Card>
        ))}

        {(projects ?? []).length === 0 ? (
          <Card className="col-span-full py-12 text-center">
            <p className="text-sm text-mid-gray">No projects yet.</p>
          </Card>
        ) : null}
      </div>

      <p className="mt-6 text-xs text-mid-gray">
        Full project detail (Overview / Subcontractors / Estimate tabs), document upload, and creating new projects
        land in steps 3-4 — see STEP2_PLAN.md for the build order.
      </p>
    </div>
  );
}
