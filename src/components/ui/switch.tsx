"use client";

import { cn } from "@/lib/utils";

/**
 * The track + sliding knob, presentation only (`aria-hidden`). Shared by the
 * standalone Switch and by whole-row toggles that own their own button — so the
 * knob geometry and motion live in exactly one place.
 */
export function SwitchThumb({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-[18px] w-[30px] shrink-0 items-center rounded-full px-[2px] transition-colors duration-[var(--dur-2)] ease-[var(--ease)]",
        checked ? "bg-brand" : "bg-surface-2",
        className
      )}
    >
      <span
        className={cn(
          "size-[14px] rounded-full bg-white shadow-[0_1px_2px_oklch(0_0_0/0.3)] transition-transform duration-[var(--dur-2)] ease-[var(--ease)]",
          checked ? "translate-x-[12px]" : "translate-x-0"
        )}
      />
    </span>
  );
}

/**
 * Boolean toggle — the brand-accented cousin of Checkbox, for settings where
 * on/off reads better than a tick. Pairs with a clickable label, or stands
 * alone with an `ariaLabel` when a parent (e.g. a whole-row toggle) supplies
 * the visible text.
 */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled,
  className,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: React.ReactNode;
  hint?: string;
  disabled?: boolean;
  className?: string;
  /** accessible name when rendered bare (no visible `label`) */
  ariaLabel?: string;
}) {
  const toggle = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex shrink-0 rounded-full transition-transform",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:pointer-events-none disabled:opacity-55",
        !label && className
      )}
    >
      <SwitchThumb checked={checked} />
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
