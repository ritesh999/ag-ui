"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ClipboardList, FileStack, ListChecks, Search } from "lucide-react";
import { projects } from "@/lib/data";
import { useAppData } from "@/lib/store";

interface Result {
  id: string;
  icon: typeof Search;
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const router = useRouter();
  const { rfis, submittals, punchItems } = useAppData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const projectResults: Result[] = projects
      .filter((p) => p.name.toLowerCase().includes(q) || p.jobNumber.toLowerCase().includes(q) || p.client.toLowerCase().includes(q))
      .slice(0, 4)
      .map((p) => ({ id: p.id, icon: Building2, title: p.name, subtitle: `Project · ${p.jobNumber}`, href: `/projects/${p.id}` }));

    const rfiResults: Result[] = rfis
      .filter((r) => r.subject.toLowerCase().includes(q) || r.number.toLowerCase().includes(q))
      .slice(0, 4)
      .map((r) => {
        const project = projects.find((p) => p.id === r.projectId);
        return { id: r.id, icon: ClipboardList, title: `${r.number} — ${r.subject}`, subtitle: `RFI · ${project?.name ?? ""}`, href: `/projects/${r.projectId}/rfis` };
      });

    const submittalResults: Result[] = submittals
      .filter((s) => s.title.toLowerCase().includes(q) || s.number.toLowerCase().includes(q))
      .slice(0, 4)
      .map((s) => {
        const project = projects.find((p) => p.id === s.projectId);
        return { id: s.id, icon: FileStack, title: `${s.number} — ${s.title}`, subtitle: `Submittal · ${project?.name ?? ""}`, href: `/projects/${s.projectId}/submittals` };
      });

    const taskResults: Result[] = punchItems
      .filter((t) => t.title.toLowerCase().includes(q))
      .slice(0, 4)
      .map((t) => {
        const project = projects.find((p) => p.id === t.projectId);
        return { id: t.id, icon: ListChecks, title: t.title, subtitle: `Task · ${project?.name ?? ""}`, href: `/projects/${t.projectId}/tasks` };
      });

    return [...projectResults, ...rfiResults, ...submittalResults, ...taskResults].slice(0, 10);
  }, [query, rfis, submittals, punchItems]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div ref={containerRef} className="relative hidden sm:block">
      <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search projects, RFIs, submittals..."
        className="w-72 rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
      {open && query.trim().length >= 2 ? (
        <div className="absolute left-0 top-11 z-20 w-96 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">No matches for &ldquo;{query}&rdquo;</p>
          ) : (
            <ul className="max-h-96 divide-y divide-gray-100 overflow-y-auto">
              {results.map((r) => {
                const Icon = r.icon;
                return (
                  <li key={`${r.subtitle}-${r.id}`}>
                    <button
                      onClick={() => go(r.href)}
                      className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left hover:bg-gray-50"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{r.title}</p>
                        <p className="truncate text-xs text-gray-500">{r.subtitle}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
