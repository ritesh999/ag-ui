"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Database, FileSpreadsheet, FolderOpen, UserPlus } from "lucide-react";
import clsx from "clsx";
import { OrgSwitcher } from "./OrgSwitcher";
import { signOut } from "@/app/(app)/actions";
import type { UserOrganization } from "@/lib/current-org";

const navItems = [
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/resources", label: "Resources", icon: Database },
  { href: "/workbook-templates", label: "Workbook Templates", icon: FileSpreadsheet },
];

export function Sidebar({
  organizations,
  currentOrgId,
  userEmail,
}: {
  organizations: UserOrganization[];
  currentOrgId: string;
  userEmail: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-hairline bg-surface-alt">
      <div className="flex h-14 items-center gap-2 px-4">
        <Building2 className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight text-ink">Build OS</span>
      </div>

      <div className="px-3 pb-3">
        <OrgSwitcher organizations={organizations} currentOrgId={currentOrgId} />
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-2.5 rounded-[var(--radius-nested)] px-3 py-2 text-sm font-medium",
                active ? "bg-primary-tint text-primary" : "text-ink-soft hover:bg-canvas"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <Link
          href="/organization"
          className="block rounded-[var(--radius-nested)] border border-hairline bg-paper p-3 hover:bg-canvas"
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <UserPlus className="h-3.5 w-3.5" />
            Invite Teammates
          </span>
          <span className="mt-1 block text-xs text-mid-gray">
            Collaborate with your team by adding members to your organization
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2.5 border-t border-hairline p-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
          {userEmail.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-mid-gray">{userEmail}</span>
        <form action={signOut}>
          <button type="submit" className="text-xs font-medium text-mid-gray hover:text-ink">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
