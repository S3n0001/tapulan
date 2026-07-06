"use client";

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
  return (
    <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-1.5">
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
            onClick={() => onChange(hue)}
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
