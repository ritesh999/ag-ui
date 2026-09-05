import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui";
import { ProjectTabs } from "./ProjectTabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, status, is_sample, created_at")
    .eq("id", params.id)
    .single();

  // RLS means a project in another org simply doesn't come back — this
  // covers both "doesn't exist" and "not yours" with the same 404,
  // rather than leaking which one it is.
  if (!project) notFound();

  return (
    <div>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-mid-gray hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Back to Projects
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <h1 className="text-heading-sm font-semibold tracking-tight text-ink">{project.name}</h1>
          <Badge tone="soft">{project.status.replace(/_/g, " ")}</Badge>
        </div>
        <span className="text-xs text-mid-gray">
          Created {new Date(project.created_at).toLocaleDateString()}
        </span>
      </div>

      {project.is_sample ? (
        <div className="mb-6 rounded-[var(--radius-nested)] border border-hairline bg-canvas px-4 py-3 text-sm text-mid-gray">
          <strong className="text-ink">Sample Project</strong> — this is a sample project for demonstration
          purposes.
        </div>
      ) : null}

      <ProjectTabs projectId={project.id} />

      {children}
    </div>
  );
}
