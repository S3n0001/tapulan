"use client";

import { cn } from "@/lib/utils";

/**
 * Boolean toggle — the brand-accented cousin of Checkbox, for settings where
 * on/off reads better than a tick. Pairs with a clickable label.
 */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: React.ReactNode;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full border border-transparent px-[2px] transition-colors duration-[var(--dur-2)] ease-[var(--ease)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:pointer-events-none disabled:opacity-55",
        checked ? "bg-brand" : "bg-surface-2",
        !label && className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-[14px] rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.3)] transition-transform duration-[var(--dur-2)] ease-[var(--ease)]",
          checked ? "translate-x-[12px]" : "translate-x-0"
        )}
      />
    </button>
  );

  if (!label) return toggle;

  return (
    <label
      className={cn(
        "flex cursor-pointer select-none items-center justify-between gap-3",
        disabled && "cursor-not-allowed",
        className
      )}
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[12px] leading-snug text-muted">{hint}</span>}
      </span>
      {toggle}
    </label>
  );
}
