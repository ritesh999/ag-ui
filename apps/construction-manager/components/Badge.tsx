import clsx from "clsx";
import { BadgeTone, toneClasses } from "@/lib/status";

export function Badge({
  label,
  tone = "gray",
  className,
}: {
  label: string;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClasses[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
