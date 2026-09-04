export const TODAY = "2026-09-04";

export function formatCurrency(value: number, opts: { compact?: boolean } = {}) {
  if (opts.compact) {
    return formatCompactCurrency(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

// A hand-rolled compact formatter instead of Intl's `notation: "compact"`:
// that option renders "$96M" vs "$96.0M" depending on the runtime's ICU
// data, which differs between Node (SSR) and the browser and causes React
// hydration mismatches. This is deterministic across both.
function formatCompactCurrency(value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const trimTrailingZero = (s: string) => (s.endsWith(".0") ? s.slice(0, -2) : s);

  if (abs >= 1_000_000_000) return `${sign}$${trimTrailingZero((abs / 1_000_000_000).toFixed(1))}B`;
  if (abs >= 1_000_000) return `${sign}$${trimTrailingZero((abs / 1_000_000).toFixed(1))}M`;
  if (abs >= 1_000) return `${sign}$${trimTrailingZero((abs / 1_000).toFixed(1))}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function formatDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateShort(value: string) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function daysUntil(value: string) {
  const target = new Date(`${value}T00:00:00`).getTime();
  const now = new Date(`${TODAY}T00:00:00`).getTime();
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

export function formatKb(kb: number) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${kb} KB`;
}
