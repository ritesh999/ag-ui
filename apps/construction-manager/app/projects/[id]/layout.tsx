import { notFound } from "next/navigation";
import { getProject, projects } from "@/lib/data";
import { ProjectHeader } from "@/components/ProjectHeader";

// The 5 seed projects are the only project ids this app ever routes to
// (there's no "create project" flow — see the README). Declaring them here
// lets this whole [id] segment be statically exported for GitHub Pages.
export function generateStaticParams() {
  return projects.map((p) => ({ id: p.id }));
}

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const project = getProject(params.id);
  if (!project) notFound();

  return (
    <div>
      <ProjectHeader project={project} />
      {children}
    </div>
  );
}
