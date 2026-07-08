import { CalendarRange } from "lucide-react";
import { ViewChrome } from "@/components/shell/view-chrome";
import { Skeleton } from "@/components/ui/skeleton";

/** Calendar, loading — the month grid's exact geometry, quietly pulsing. */

// deterministic chip counts per desktop cell (5 weeks × 7 days)
const CELL_CHIPS = [
  0, 1, 0, 2, 1, 0, 0, 1, 0, 1, 0, 0, 2, 0, 0, 2, 1, 0, 1, 0, 0, 1, 0, 0, 1, 2, 0, 0, 0, 1,
  0, 1, 0, 0, 1,
];
const CHIP_W = ["85%", "62%", "74%"];

export default function CalendarLoading() {
  return (
    <ViewChrome
      title="Calendar"
      icon={CalendarRange}
      meta={
        <>
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-12" />
        </>
      }
      right={
        <span className="flex items-center gap-1.5">
          <Skeleton className="h-6 w-24 rounded-[var(--r-chip)]" />
          <Skeleton className="h-6 w-12 rounded-[var(--r-chip)]" />
          <Skeleton className="size-7 rounded-[var(--r-control)]" />
          <Skeleton className="size-7 rounded-[var(--r-control)]" />
        </span>
      }
    >
      <span role="status" className="sr-only">
        Loading calendar…
      </span>

      {/* desktop month grid */}
      <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <div className="grid shrink-0 grid-cols-7 border-b border-line">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className={`flex h-8 items-center px-2 ${i > 0 ? "border-l border-line" : ""}`}
            >
              <Skeleton className="h-2.5 w-7" />
            </div>
          ))}
        </div>
        <div
          className="grid min-h-[480px] flex-1 grid-cols-7"
          style={{ gridTemplateRows: "repeat(5, minmax(0, 1fr))" }}
        >
          {CELL_CHIPS.map((chips, i) => (
            <div
              key={i}
              className={`flex min-w-0 flex-col overflow-hidden ${i >= 7 ? "border-t border-line" : ""} ${
                i % 7 > 0 ? "border-l border-line" : ""
              }`}
            >
              <div className="flex h-6 shrink-0 items-center px-2 pt-1">
                <Skeleton className="h-3 w-4" />
              </div>
              <div className="flex flex-col gap-[2px] px-1 pb-1">
                {Array.from({ length: chips }, (_, c) => (
                  <Skeleton
                    key={c}
                    className="h-[18px] rounded-[4px]"
                    style={{ width: CHIP_W[(i + c) % CHIP_W.length] }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* mobile month grid + day agenda */}
      <div className="lg:hidden">
        <div className="border-b border-line px-2 pb-1.5 pt-2">
          <div className="grid grid-cols-7">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="flex justify-center pb-1">
                <Skeleton className="h-2 w-2.5" />
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }, (_, i) => (
              <span key={i} className="flex h-12 justify-center pt-1">
                <Skeleton className="size-6 rounded-full" />
              </span>
            ))}
          </div>
        </div>
        <div className="flex h-8 items-center gap-2 border-b border-line/70 bg-[color-mix(in_oklab,var(--surface)_45%,var(--bg))] px-3.5">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-2.5 w-10" />
        </div>
        <div className="divide-y divide-line/80">
          {["54%", "41%"].map((w, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-2">
              <Skeleton className="size-[18px] shrink-0 rounded-[5px]" />
              <Skeleton className="h-[18px] w-11 shrink-0 rounded-[4px]" />
              <Skeleton className="h-3.5 max-w-80" style={{ width: w }} />
              <span className="ml-auto flex shrink-0 items-center gap-3">
                <Skeleton className="h-3 w-16" />
              </span>
            </div>
          ))}
        </div>
      </div>
    </ViewChrome>
  );
}
