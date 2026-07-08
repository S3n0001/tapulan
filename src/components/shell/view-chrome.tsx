import { Fragment, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  onClick?: () => void;
  /** data labels (subject/type codes) keep the mono discipline */
  mono?: boolean;
}

/**
 * The view frame. On desktop the header lifts OUT of the content panel into the
 * app chrome — it sits on the shell bg, above the rounded card, so the card is
 * nothing but content (the Linear pattern). On mobile the global top bar already
 * carries the view title, so the header folds into a sticky bar at the top of the
 * edge-to-edge panel instead — only a drilled-in crumb adds new information there.
 *
 * `flat` drops the desktop panel (bg + border + rounding) so the children sit
 * straight on the shell void. Use it for views that are already made of their own
 * self-contained cards — a panel behind them would just be a same-color backdrop.
 * Mobile still gets the edge-to-edge panel and its sticky header.
 */
export function ViewChrome({
  title,
  icon: Icon,
  crumbs,
  meta,
  right,
  subrow,
  mobileSubrow,
  flat,
  className,
  children,
}: {
  title: string;
  /** the view's mark from nav.ts — sits quietly beside the title */
  icon?: LucideIcon;
  /** drill-in trail — replaces the title; the last segment is the current page */
  crumbs?: Crumb[];
  /** quiet context beside the title — date ranges, counts (`.tnum` on numeric spans) */
  meta?: ReactNode;
  /** right-aligned controls */
  right?: ReactNode;
  /** filters / tabs — desktop chrome second row, and folded into the mobile bar */
  subrow?: ReactNode;
  /** a row shown only on mobile, e.g. the week's day switcher */
  mobileSubrow?: ReactNode;
  /** drop the desktop content panel — children sit on the shell (see note above) */
  flat?: boolean;
  /** extra classes for the content panel */
  className?: string;
  children?: ReactNode;
}) {
  const trail = crumbs && crumbs.length > 0 ? crumbs : null;
  const leaf = trail ? trail[trail.length - 1] : null;

  const metaEl = meta ? (
    <div className="flex items-center gap-2 text-[13px] text-muted">{meta}</div>
  ) : null;
  const rightEl = right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null;

  const heading = trail ? (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 leading-7">
      {trail.slice(0, -1).map((c, i) => (
        <Fragment key={i}>
          {c.onClick ? (
            <button
              type="button"
              onClick={c.onClick}
              className={cn(
                "tap -mx-1 shrink-0 rounded-[4px] px-1 text-muted transition-colors hover:text-ink",
                c.mono ? "font-mono text-[13px] font-medium" : "text-[15px]"
              )}
            >
              {c.label}
            </button>
          ) : (
            <span
              className={cn(
                "shrink-0 text-muted",
                c.mono ? "font-mono text-[13px] font-medium" : "text-[15px]"
              )}
            >
              {c.label}
            </span>
          )}
          <span aria-hidden className="shrink-0 text-[13px] text-faint">
            /
          </span>
        </Fragment>
      ))}
      <h2
        className={cn(
          "min-w-0 truncate text-ink",
          trail.length > 1
            ? "text-[15px] font-medium tracking-[-0.01em]"
            : "text-[20px] font-semibold tracking-[-0.015em]"
        )}
      >
        {leaf!.label}
      </h2>
    </nav>
  ) : (
    <h2 className="min-w-0 truncate text-[20px] font-semibold leading-7 tracking-[-0.015em] text-ink">
      {title}
    </h2>
  );

  return (
    <div className="anim-view flex flex-1 flex-col lg:min-h-0">
      {/* desktop chrome — lifted above the panel, sitting on the shell bg */}
      <div className="hidden shrink-0 flex-col lg:flex">
        <div className="flex min-h-12 items-center gap-2.5 px-4 pb-2.5 pt-4">
          {Icon && <Icon aria-hidden className="size-4.5 shrink-0 text-muted" strokeWidth={1.75} />}
          <div className="flex min-w-0 items-center gap-2.5">
            {heading}
            {metaEl}
          </div>
          {rightEl}
        </div>
        {subrow && <div className="pb-1.5">{subrow}</div>}
      </div>

      {/* content panel — flat views drop the desktop bg/border so children
          float on the shell; mobile keeps the edge-to-edge panel either way */}
      <div
        className={cn(
          "relative flex flex-1 flex-col bg-bg pb-[calc(52px+env(safe-area-inset-bottom))] lg:min-h-0 lg:overflow-y-auto lg:pb-0",
          flat
            ? "lg:bg-transparent"
            : "lg:rounded-[var(--r-panel)] lg:border lg:border-line",
          className
        )}
      >
        {/* mobile header — the chrome folded into the top of the panel */}
        <div className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-20 shrink-0 border-b border-line bg-bg/95 backdrop-blur lg:hidden">
          <div className="flex h-11 items-center gap-2.5 px-3.5">
            {/* the global bar already names the view — only a drilled-in leaf is news */}
            {trail && trail.length > 1 && (
              <span className="min-w-0 truncate text-[13px] font-semibold tracking-[-0.01em] text-ink">
                {leaf!.label}
              </span>
            )}
            {metaEl}
            {rightEl}
          </div>
          {subrow}
          {mobileSubrow}
        </div>

        {children}
      </div>
    </div>
  );
}
