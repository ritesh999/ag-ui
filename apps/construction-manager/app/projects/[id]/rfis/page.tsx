import { notFound } from "next/navigation";
import { getProject, getRfisForProject } from "@/lib/data";
import { RfiExplorer } from "@/components/RfiExplorer";

export default function ProjectRfisPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  if (!project) notFound();

  const rfis = getRfisForProject(project.id);

  return <RfiExplorer rfis={rfis} />;
}
