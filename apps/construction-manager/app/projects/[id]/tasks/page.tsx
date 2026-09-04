import { notFound } from "next/navigation";
import { getProject, getPunchItemsForProject } from "@/lib/data";
import { PunchBoard } from "@/components/PunchBoard";

export default function ProjectTasksPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  if (!project) notFound();

  const items = getPunchItemsForProject(project.id);

  return <PunchBoard items={items} />;
}
