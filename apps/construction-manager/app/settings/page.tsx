import { PageHeader, SectionCard } from "@/components/SectionCard";

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Company and workspace preferences" />
      <SectionCard title="Company">
        <div className="space-y-4 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Company Name</p>
            <p className="mt-1 text-gray-900">Vantage Construction</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Default Currency</p>
            <p className="mt-1 text-gray-900">USD ($)</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Fiscal Year Start</p>
            <p className="mt-1 text-gray-900">January</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
