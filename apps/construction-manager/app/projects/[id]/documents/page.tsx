import { notFound } from "next/navigation";
import { getProject, getDocumentsForProject } from "@/lib/data";
import { DocumentBrowser } from "@/components/DocumentBrowser";

export default function ProjectDocumentsPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  if (!project) notFound();

  const documents = getDocumentsForProject(project.id);

  return <DocumentBrowser documents={documents} />;
}
