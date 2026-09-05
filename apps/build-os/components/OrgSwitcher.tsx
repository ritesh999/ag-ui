"use client";

import { useState, useTransition } from "react";
import { ChevronsUpDown, Building2 } from "lucide-react";
import { switchOrganization } from "@/app/(app)/actions";
import type { UserOrganization } from "@/lib/current-org";

export function OrgSwitcher({
  organizations,
  currentOrgId,
}: {
  organizations: UserOrganization[];
  currentOrgId: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const current = organizations.find((o) => o.id === currentOrgId) ?? organizations[0];

  function handleSwitch(orgId: string) {
    setOpen(false);
    if (orgId === currentOrgId) return;
    startTransition(async () => {
      await switchOrganization(orgId);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex w-full items-center gap-2.5 rounded-[var(--radius-nested)] bg-canvas p-2.5 text-left hover:bg-hairline"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-small)] bg-paper">
          <Building2 className="h-4 w-4 text-ink-soft" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{current?.name ?? "—"}</span>
          <span className="block text-xs text-mid-gray">
            {organizations.length} organization{organizations.length === 1 ? "" : "s"}
          </span>
        </span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-mid-gray" />
      </button>

      {open ? (
        <div className="shadow-card absolute left-0 right-0 top-full z-10 mt-1 rounded-[var(--radius-nested)] border border-hairline bg-paper py-1">
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => handleSwitch(org.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-canvas"
            >
              <span className="truncate">{org.name}</span>
              {org.id === currentOrgId ? <span className="text-xs text-primary">Current</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
