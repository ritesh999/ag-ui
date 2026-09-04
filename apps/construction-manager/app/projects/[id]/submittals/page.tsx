"use client";

import { notFound } from "next/navigation";
import { getProject, getSubmittalsForProject } from "@/lib/data";
import { SubmittalExplorer } from "@/components/SubmittalExplorer";
import { useAppData } from "@/lib/store";

export default function ProjectSubmittalsPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  const { submittals: allSubmittals } = useAppData();
  if (!project) notFound();

  const submittals = getSubmittalsForProject(allSubmittals, project.id);

  return <SubmittalExplorer projectId={project.id} submittals={submittals} />;
}
