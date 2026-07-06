import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The 44px view header. On desktop it names the view (the sidebar has no
 * page titles); on mobile the global top bar already does, so the title
 * hides and only the controls remain.
 */
export function Toolbar({
  title,
  meta,
  right,
  className,
  children,
}: {
  title: string;
  /** quiet context next to the title — counts, date ranges (mono) */
  meta?: ReactNode;
  /** right-aligned controls */
  right?: ReactNode;
  className?: string;
  /** full-width second row (filters, day tabs) */
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky top-[calc(3rem+env(safe-area-inset-top))] z-20 border-b border-line bg-bg/95 backdrop-blur lg:top-0",
        className
      )}
    >
      <div className="flex h-11 items-center gap-2.5 px-3.5 lg:px-4">
        <h2 className="hidden text-[13px] font-semibold tracking-[-0.01em] text-ink lg:block">
          {title}
        </h2>
        {meta && <div className="tnum flex items-center gap-2 font-mono text-[12px] text-faint">{meta}</div>}
        {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
      </div>
      {children}
    </div>
  );
}
