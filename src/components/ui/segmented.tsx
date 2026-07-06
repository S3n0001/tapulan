"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  "aria-label"?: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel: string;
}) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex h-8 items-stretch gap-[3px] rounded-[7px] border border-line bg-surface p-[3px]",
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-[3px] rounded-[5px] bg-surface-2 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)] transition-transform duration-[var(--dur-2)] ease-[var(--ease)]"
        style={{
          width: `calc((100% - 6px - ${(options.length - 1) * 3}px) / ${options.length})`,
          transform: `translateX(calc(${activeIndex} * (100% + 3px)))`,
          left: 3,
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={opt["aria-label"]}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative z-10 flex min-w-8 flex-1 items-center justify-center rounded-[5px] px-2 text-[12.5px] font-medium transition-colors duration-[var(--dur-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)]",
              active ? "text-ink" : "text-muted hover:text-ink"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
