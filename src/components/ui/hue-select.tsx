"use client";

import { useRef } from "react";
import { HUES } from "@/lib/domain/hues";
import { accentStyle } from "@/lib/domain/hues";
import { cn } from "@/lib/utils";

export function HueSelect({
  value,
  onChange,
  idPrefix,
}: {
  value: string;
  onChange: (hue: string) => void;
  idPrefix?: string;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const activeIndex = Math.max(0, HUES.indexOf(value as (typeof HUES)[number]));

  const move = (dir: 1 | -1) => {
    const next = (activeIndex + dir + HUES.length) % HUES.length;
    onChange(HUES[next]);
    // move focus with the selection, per the radiogroup pattern
    groupRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
      ?.[next]?.focus();
  };

  return (
    <div ref={groupRef} role="radiogroup" aria-label="Color" className="flex flex-wrap gap-1.5">
      {HUES.map((hue) => {
        const selected = hue === value;
        return (
          <button
            key={hue}
            id={idPrefix ? `${idPrefix}-${hue}` : undefined}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={hue}
            title={hue}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(hue)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") {
                e.preventDefault();
                move(1);
              } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                move(-1);
              }
            }}
            style={accentStyle(hue)}
            className={cn(
              "a-dot size-6 rounded-[6px] transition-transform duration-[var(--dur-1)] hover:scale-105 active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--a)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              selected && "ring-2 ring-[var(--a)] ring-offset-2 ring-offset-[var(--bg)]"
            )}
          />
        );
      })}
    </div>
  );
}
