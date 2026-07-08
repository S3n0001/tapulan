import { Fragment } from "react";
import { NAV } from "@/components/shell/nav";

/**
 * A terse "what's inside" legend, sourced straight from the app's NAV config so
 * it can never drift from the real views. Icons + labels only — no descriptions,
 * no mini-previews. It names the five views without becoming a features tour.
 */
export function CapabilityLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-faint">
      <span className="text-muted">Inside</span>
      {NAV.map((n, i) => (
        <Fragment key={n.href}>
          {i > 0 && (
            <span aria-hidden className="text-line-strong">
              ·
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <n.icon aria-hidden className="size-3.5" strokeWidth={1.75} />
            {n.label}
          </span>
        </Fragment>
      ))}
    </p>
  );
}
