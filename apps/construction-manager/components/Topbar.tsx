import { Bell } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";

export function Topbar({ title }: { title?: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        {title ? <span className="font-medium text-gray-900">{title}</span> : null}
      </div>
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
          ER
        </div>
      </div>
    </header>
  );
}
