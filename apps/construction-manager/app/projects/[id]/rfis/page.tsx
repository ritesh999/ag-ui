"use client";

import { notFound } from "next/navigation";
import { getProject, getRfisForProject } from "@/lib/data";
import { RfiExplorer } from "@/components/RfiExplorer";
import { useAppData } from "@/lib/store";

export default function ProjectRfisPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  const { rfis: allRfis } = useAppData();
  if (!project) notFound();

  const rfis = getRfisForProject(allRfis, project.id);

  return <RfiExplorer projectId={project.id} rfis={rfis} />;
}
