"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { FileText, FileSpreadsheet, FileImage, FileCode2, File as FileIcon } from "lucide-react";
import { DocumentItem } from "@/lib/types";
import { EmptyState } from "./SectionCard";
import { formatDate, formatKb } from "@/lib/format";

const fileIcon: Record<DocumentItem["fileType"], typeof FileText> = {
  pdf: FileText,
  dwg: FileCode2,
  xlsx: FileSpreadsheet,
  docx: FileText,
  jpg: FileImage,
};

export function DocumentBrowser({ documents }: { documents: DocumentItem[] }) {
  const categories = useMemo(
    () => Array.from(new Set(documents.map((d) => d.category))).sort(),
    [documents]
  );
  const [category, setCategory] = useState<string>("all");

  const filtered = category === "all" ? documents : documents.filter((d) => d.category === category);

  if (documents.length === 0) {
    return <EmptyState message="No documents have been uploaded to this project yet." />;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          onClick={() => setCategory("all")}
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs font-medium",
            category === "all" ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          All Documents
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              category === c ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Category</th>
              <th className="px-5 py-3 font-medium">Version</th>
              <th className="px-5 py-3 font-medium">Uploaded By</th>
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 font-medium">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((doc) => {
              const Icon = fileIcon[doc.fileType] ?? FileIcon;
              return (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="font-medium text-gray-900">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{doc.category}</td>
                  <td className="px-5 py-3 text-gray-600">{doc.version}</td>
                  <td className="px-5 py-3 text-gray-600">{doc.uploadedBy}</td>
                  <td className="px-5 py-3 text-gray-600">{formatDate(doc.uploadedAt)}</td>
                  <td className="px-5 py-3 text-gray-600">{formatKb(doc.sizeKb)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
