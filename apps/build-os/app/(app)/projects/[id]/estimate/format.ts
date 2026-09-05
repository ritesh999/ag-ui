export function formatMoney(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
