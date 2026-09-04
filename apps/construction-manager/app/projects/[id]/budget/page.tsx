import { notFound } from "next/navigation";
import { AlertTriangle, TrendingUp, Wallet } from "lucide-react";
import { getProject, getBudgetForProject, projectTotals } from "@/lib/data";
import { StatCard } from "@/components/StatCard";
import { SectionCard } from "@/components/SectionCard";
import { formatCurrency } from "@/lib/format";

export default function ProjectBudgetPage({ params }: { params: { id: string } }) {
  const project = getProject(params.id);
  if (!project) notFound();

  const lines = getBudgetForProject(project.id);
  const totals = projectTotals(project.id);
  const usedPct = totals.budgeted > 0 ? Math.round((totals.spent / totals.budgeted) * 100) : 0;

  const byCategory = lines.reduce<Record<string, typeof lines>>((acc, line) => {
    acc[line.category] = acc[line.category] || [];
    acc[line.category].push(line);
    return acc;
  }, {});

  const overBudgetCount = lines.filter((l) => l.committed > l.budgeted).length;

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Budgeted" value={formatCurrency(totals.budgeted, { compact: true })} icon={Wallet} />
        <StatCard label="Committed" value={formatCurrency(totals.committed, { compact: true })} icon={TrendingUp} />
        <StatCard label="Spent to Date" value={formatCurrency(totals.spent, { compact: true })} hint={`${usedPct}% of budget`} />
        <StatCard
          label="Cost Codes Over Budget"
          value={String(overBudgetCount)}
          icon={AlertTriangle}
          tone={overBudgetCount > 0 ? "red" : "green"}
        />
      </div>

      {Object.entries(byCategory).map(([category, categoryLines]) => {
        const catBudgeted = categoryLines.reduce((s, l) => s + l.budgeted, 0);
        const catCommitted = categoryLines.reduce((s, l) => s + l.committed, 0);
        const catSpent = categoryLines.reduce((s, l) => s + l.spent, 0);

        return (
          <SectionCard key={category} title={category} padded={false} className="mb-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-2.5 font-medium">Cost Code</th>
                    <th className="px-5 py-2.5 font-medium">Description</th>
                    <th className="px-5 py-2.5 text-right font-medium">Budgeted</th>
                    <th className="px-5 py-2.5 text-right font-medium">Committed</th>
                    <th className="px-5 py-2.5 text-right font-medium">Spent</th>
                    <th className="px-5 py-2.5 text-right font-medium">Variance</th>
                    <th className="px-5 py-2.5 font-medium">% Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categoryLines.map((line) => {
                    const variance = line.budgeted - line.committed;
                    const pct = line.budgeted > 0 ? Math.min(100, Math.round((line.spent / line.budgeted) * 100)) : 0;
                    return (
                      <tr key={line.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2.5 font-mono text-xs text-gray-500">{line.costCode}</td>
                        <td className="px-5 py-2.5 text-gray-900">{line.description}</td>
                        <td className="px-5 py-2.5 text-right text-gray-700">{formatCurrency(line.budgeted)}</td>
                        <td className="px-5 py-2.5 text-right text-gray-700">{formatCurrency(line.committed)}</td>
                        <td className="px-5 py-2.5 text-right text-gray-700">{formatCurrency(line.spent)}</td>
                        <td className={`px-5 py-2.5 text-right font-medium ${variance < 0 ? "text-red-600" : "text-gray-700"}`}>
                          {formatCurrency(variance)}
                        </td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                              <div
                                className={`h-full rounded-full ${pct >= 100 ? "bg-red-500" : "bg-brand-500"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-medium text-gray-900">
                    <td className="px-5 py-2.5" colSpan={2}>
                      Subtotal
                    </td>
                    <td className="px-5 py-2.5 text-right">{formatCurrency(catBudgeted)}</td>
                    <td className="px-5 py-2.5 text-right">{formatCurrency(catCommitted)}</td>
                    <td className="px-5 py-2.5 text-right">{formatCurrency(catSpent)}</td>
                    <td className={`px-5 py-2.5 text-right ${catBudgeted - catCommitted < 0 ? "text-red-600" : ""}`}>
                      {formatCurrency(catBudgeted - catCommitted)}
                    </td>
                    <td className="px-5 py-2.5" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </SectionCard>
        );
      })}

      <SectionCard padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <span className="text-sm font-semibold text-gray-900">Project Total</span>
          <div className="flex flex-wrap gap-6 text-sm">
            <Total label="Budgeted" value={totals.budgeted} />
            <Total label="Committed" value={totals.committed} />
            <Total label="Spent" value={totals.spent} />
            <Total label="Variance" value={totals.variance} negativeIsBad />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function Total({ label, value, negativeIsBad }: { label: string; value: number; negativeIsBad?: boolean }) {
  return (
    <div className="text-right">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`font-semibold ${negativeIsBad && value < 0 ? "text-red-600" : "text-gray-900"}`}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}
