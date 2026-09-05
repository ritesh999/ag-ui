"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Building2, Plus } from "lucide-react";
import { Badge, Button, Card } from "@/components/ui";
import { CreateProjectModal } from "./CreateProjectModal";

export interface ProjectListRow {
  id: string;
  name: string;
  client: string | null;
  location: string | null;
  industry: string | null;
  is_sample: boolean;
  status: string;
}

export function ProjectsList({ organizationId, projects }: { organizationId: string; projects: ProjectListRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="mb-1 text-heading-sm font-semibold tracking-tight text-ink">Projects</h1>
          <p className="text-sm text-mid-gray">Manage your projects below.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create Project
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <h3 className="mb-1 text-lg font-semibold text-ink">{p.name}</h3>
              <p className="mb-2 text-sm text-mid-gray">{p.client}</p>
              {p.location ? (
                <p className="mb-1 flex items-center gap-1.5 text-sm text-mid-gray">
                  <MapPin className="h-3.5 w-3.5" />
                  {p.location}
                </p>
              ) : null}
              {p.industry ? (
                <p className="mb-3 flex items-center gap-1.5 text-sm text-mid-gray">
                  <Building2 className="h-3.5 w-3.5" />
                  {p.industry}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {p.is_sample ? <Badge tone="solid">Sample Project</Badge> : null}
                <Badge tone="soft">{p.status.replace(/_/g, " ")}</Badge>
              </div>
            </Card>
          </Link>
        ))}

        {projects.length === 0 ? (
          <Card className="col-span-full py-12 text-center">
            <p className="mb-3 text-sm text-mid-gray">No projects yet.</p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create Project
            </Button>
          </Card>
        ) : null}
      </div>

      <CreateProjectModal organizationId={organizationId} open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
