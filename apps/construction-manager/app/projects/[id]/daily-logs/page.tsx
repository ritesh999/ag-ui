import { notFound } from "next/navigation";
import { getProject, getDailyLogsForProject } from "@/lib/data";
import { DailyLogExplorer } from "@/components/DailyLogExplorer";

export default function ProjectDailyLogsPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  if (!project) notFound();

  const logs = getDailyLogsForProject(project.id);

  return <DailyLogExplorer logs={logs} />;
}
