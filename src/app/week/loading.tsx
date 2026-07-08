import { CalendarDays } from "lucide-react";
import { ViewChrome } from "@/components/shell/view-chrome";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Week, loading — a ghost of the time-proportional canvas: hour gutter,
 * five bordered columns, class-block placeholders and hatched break slabs
 * at the canonical slot positions. Same scales as the live view.
 */

const PX_DESKTOP = 1.15;
const PX_MOBILE = 1.5;
const DAY_START = 7 * 60;
const DAY_END = 16 * 60;

const SLOTS: { s: number; e: number; kind: "class" | "break" }[] = [
  { s: 465, e: 555, kind: "class" },
  { s: 555, e: 575, kind: "break" },
  { s: 575, e: 665, kind: "class" },
  { s: 665, e: 705, kind: "break" },
  { s: 705, e: 795, kind: "class" },
  { s: 805, e: 895, kind: "class" },
  { s: 895, e: 915, kind: "break" },
];

const HOURS = Array.from(
  { length: (DAY_END - DAY_START) / 60 + 1 },
  (_, i) => DAY_START + i * 60
);

function GhostColumn({ px }: { px: number }) {
  return (
    <div className="relative border-l border-line/70" style={{ height: (DAY_END - DAY_START) * px }}>
      {HOURS.map((m) => (
        <div
          key={m}
          aria-hidden
          className="absolute inset-x-0 border-t border-line/55"
          style={{ top: (m - DAY_START) * px }}
        />
      ))}
      {SLOTS.map(({ s, e, kind }) =>
        kind === "break" ? (
          <div
            key={s}
            className="hatch absolute inset-x-0 border-y border-line/50 bg-surface/60"
            style={{ top: (s - DAY_START) * px, height: (e - s) * px }}
          />
        ) : (
          <div
            key={s}
            className="absolute inset-x-[3px] overflow-hidden rounded-[6px] border border-line/70 bg-surface/80 px-1.5 py-1.5"
            style={{ top: (s - DAY_START) * px + 1, height: (e - s) * px - 3 }}
          >
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="mt-1.5 h-3 w-3/5" />
            <Skeleton className="absolute bottom-1.5 left-1.5 h-2.5 w-14" />
          </div>
        )
      )}
    </div>
  );
}

function GhostGutter({ px, width }: { px: number; width: number }) {
  return (
    <div className="relative" style={{ height: (DAY_END - DAY_START) * px, width }}>
      {HOURS.map((m) => (
        <Skeleton
          key={m}
          className="absolute right-1.5 h-2.5 w-6 -translate-y-1/2"
          style={{ top: (m - DAY_START) * px }}
        />
      ))}
    </div>
  );
}

export default function WeekLoading() {
  return (
    <ViewChrome
      title="Week"
      icon={CalendarDays}
      meta={<Skeleton className="h-3.5 w-20" />}
      right={
        <span className="flex items-center gap-0.5">
          <Skeleton className="size-7 rounded-[var(--r-control)]" />
          <Skeleton className="size-7 rounded-[var(--r-control)]" />
        </span>
      }
      mobileSubrow={
        <div className="grid grid-cols-5 lg:hidden" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex h-11 flex-col items-center justify-center gap-1">
              <Skeleton className="h-2 w-7" />
              <Skeleton className="h-3 w-4" />
            </div>
          ))}
        </div>
      }
    >
      <span role="status" className="sr-only">
        Loading the week…
      </span>

      {/* desktop grid */}
      <div className="hidden lg:block">
        <div className="sticky top-0 z-10 grid grid-cols-[48px_repeat(5,minmax(0,1fr))] border-b border-line bg-bg/95 backdrop-blur">
          <div />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex h-9 items-center justify-center gap-1.5 border-l border-line/70"
            >
              <Skeleton className="h-2.5 w-8" />
              <Skeleton className="h-3 w-4" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[48px_repeat(5,minmax(0,1fr))] pb-4">
          <GhostGutter px={PX_DESKTOP} width={48} />
          {[0, 1, 2, 3, 4].map((i) => (
            <GhostColumn key={i} px={PX_DESKTOP} />
          ))}
        </div>
      </div>

      {/* mobile single day */}
      <div className="lg:hidden">
        <div className="grid grid-cols-[44px_minmax(0,1fr)] pb-6 pt-2">
          <GhostGutter px={PX_MOBILE} width={44} />
          <GhostColumn px={PX_MOBILE} />
        </div>
      </div>
    </ViewChrome>
  );
}
