"use client";

import { notFound } from "next/navigation";
import { getProject, getPunchItemsForProject } from "@/lib/data";
import { PunchBoard } from "@/components/PunchBoard";
import { useAppData } from "@/lib/store";

export default function ProjectTasksPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  const { punchItems: allPunchItems } = useAppData();
  if (!project) notFound();

  const items = getPunchItemsForProject(allPunchItems, project.id);

  return <PunchBoard projectId={project.id} items={items} />;
}
