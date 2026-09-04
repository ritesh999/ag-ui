import { notFound } from "next/navigation";
import { getProject, getSubmittalsForProject } from "@/lib/data";
import { SubmittalExplorer } from "@/components/SubmittalExplorer";

export default function ProjectSubmittalsPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  if (!project) notFound();

  const submittals = getSubmittalsForProject(project.id);

  return <SubmittalExplorer submittals={submittals} />;
}
