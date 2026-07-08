"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string | number> {
  value: T;
  label: ReactNode;
  "aria-label"?: string;
}

/**
 * A single-choice value picker styled as a sliding segmented control. It's a
 * WAI-ARIA radiogroup: roving tabindex, Arrow keys move + select with wrap.
 */
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
  const groupRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  const move = (dir: 1 | -1) => {
    const next = (activeIndex + dir + options.length) % options.length;
    onChange(options[next].value);
    // move focus with the selection, per the radiogroup pattern
    groupRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      ?.[next]?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="radiogroup"
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
            role="radio"
            aria-checked={active}
            aria-label={opt["aria-label"]}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              }
            }}
            className={cn(
              "relative z-10 flex min-w-8 flex-1 items-center justify-center whitespace-nowrap rounded-[5px] px-2 text-[12.5px] font-medium transition-colors duration-[var(--dur-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)]",
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
