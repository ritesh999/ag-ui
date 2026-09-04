import { PageHeader, SectionCard } from "@/components/SectionCard";
import { team } from "@/lib/data";

export default function DirectoryPage() {
  const byCompany = team.reduce<Record<string, typeof team>>((acc, member) => {
    acc[member.company] = acc[member.company] || [];
    acc[member.company].push(member);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Company Directory" description="People working across your projects" />
      <div className="space-y-4">
        {Object.entries(byCompany).map(([company, members]) => (
          <SectionCard key={company} title={company} padded={false}>
            <ul className="divide-y divide-gray-100">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {m.initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.role}</p>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
