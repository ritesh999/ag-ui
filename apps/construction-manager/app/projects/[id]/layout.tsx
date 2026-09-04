import { notFound } from "next/navigation";
import { getProject } from "@/lib/data";
import { ProjectHeader } from "@/components/ProjectHeader";

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
