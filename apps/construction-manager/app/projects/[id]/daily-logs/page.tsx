"use client";

import { notFound } from "next/navigation";
import { getProject, getDailyLogsForProject } from "@/lib/data";
import { DailyLogExplorer } from "@/components/DailyLogExplorer";
import { useAppData } from "@/lib/store";

export default function ProjectDailyLogsPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  const { dailyLogs: allLogs } = useAppData();
  if (!project) notFound();

  const logs = getDailyLogsForProject(allLogs, project.id);

  return <DailyLogExplorer projectId={project.id} logs={logs} />;
}
