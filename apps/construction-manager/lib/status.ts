export type BadgeTone = "gray" | "blue" | "green" | "amber" | "red" | "purple";

export const toneClasses: Record<BadgeTone, string> = {
  gray: "bg-gray-100 text-gray-700 ring-gray-500/10",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  green: "bg-green-50 text-green-700 ring-green-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  purple: "bg-purple-50 text-purple-700 ring-purple-600/20",
};

export const projectStatusTone: Record<string, BadgeTone> = {
  active: "green",
  "on-hold": "amber",
  closeout: "purple",
  complete: "gray",
};

export const rfiStatusTone: Record<string, BadgeTone> = {
  open: "blue",
  "pending-response": "amber",
  closed: "green",
  overdue: "red",
};

export const submittalStatusTone: Record<string, BadgeTone> = {
  draft: "gray",
  "in-review": "blue",
  approved: "green",
  "approved-as-noted": "green",
  "revise-resubmit": "amber",
  rejected: "red",
};

export const taskStatusTone: Record<string, BadgeTone> = {
  open: "blue",
  "in-progress": "amber",
  "in-review": "purple",
  closed: "green",
};

export const priorityTone: Record<string, BadgeTone> = {
  low: "gray",
  normal: "blue",
  high: "amber",
  critical: "red",
};

export function labelize(value: string) {
  return value
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
