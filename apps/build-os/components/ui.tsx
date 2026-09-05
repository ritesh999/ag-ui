import { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

// Primary Filled Button (DESIGN.md), recolored per buildosprompt.md
// section 7: #1a73e8 fill instead of #0a0a0a.
export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" }) {
  return (
    <button
      className={clsx(
        "inline-flex h-9 items-center justify-center rounded-[var(--radius-buttons)] px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-primary text-white hover:bg-primary-hover",
        variant === "ghost" && "bg-canvas text-ink hover:bg-hairline",
        variant === "outline" && "border border-hairline bg-transparent text-ink hover:bg-canvas",
        className
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "h-9 w-full rounded-[var(--radius-inputs)] border-0 bg-canvas px-3 text-sm text-ink placeholder:text-mid-gray",
        "focus:outline-none focus:ring-1 focus:ring-hairline focus:bg-paper",
        props.className
      )}
      {...props}
    />
  );
}

export function Card({
  className,
  padded = true,
  children,
}: {
  className?: string;
  padded?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "shadow-card rounded-[var(--radius-cards)] border border-hairline bg-paper",
        padded && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  tone = "soft",
  children,
}: {
  tone?: "solid" | "soft" | "outline";
  children: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-[var(--radius-badges)] px-2 py-0.5 text-xs font-medium",
        tone === "solid" && "bg-ink-soft text-white",
        tone === "soft" && "bg-canvas text-ink-soft",
        tone === "outline" && "border border-hairline text-ink"
      )}
    >
      {children}
    </span>
  );
}

export function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-mid-gray">{label}</span>
      {children}
    </label>
  );
}
