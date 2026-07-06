"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import type { PeriodFull } from "@/lib/domain/types";
import { minutesOf, fmtMin } from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { Toolbar } from "@/components/shell/toolbar";
import { EmptyState } from "@/components/ui/empty";

/**
 * The week canvas: a true time-proportional grid. Five columns on desktop,
 * one swappable day on mobile — same block renderer, different scale.
 * Blocks are data-colored (subject hue), breaks are hatched slabs, and a
 * cobalt line tracks the current minute through today's column.
 */

const PX_DESKTOP = 1.15;
const PX_MOBILE = 1.5;

export interface WeekDay {
  /** 1 = Monday … 5 = Friday */
  day: number;
  iso: string;
  /** "MON" */
  label: string;
  /** 6 */
  dateNum: number;
  isToday: boolean;
}

interface Placed {
  p: PeriodFull;
  col: number;
  cols: number;
}

/** Greedy interval-column layout for side-by-side overlapping blocks. */
function layoutColumns(periods: PeriodFull[]): Placed[] {
  const sorted = [...periods].sort((a, b) => a.start - b.start || a.end - b.end);
  const placed: Placed[] = [];
  let cluster: { p: PeriodFull; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const cols = Math.max(...cluster.map((c) => c.col)) + 1;
    for (const c of cluster) placed.push({ p: c.p, col: c.col, cols });
    cluster = [];
    colEnds = [];
  };

  for (const p of sorted) {
    if (clusterEnd !== -1 && p.start >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= p.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(p.end);
    } else {
      colEnds[col] = p.end;
    }
    cluster.push({ p, col });
    clusterEnd = Math.max(clusterEnd, p.end);
  }
  flush();
  return placed;
}

export function WeekView({
  periods,
  days,
  nowISO,
  showStrand,
}: {
  periods: PeriodFull[];
  days: WeekDay[];
  nowISO: string;
  showStrand: boolean;
}) {
  const now = useNow(nowISO, 60_000);
  const nowMin = minutesOf(now);

  const todayDay = days.find((d) => d.isToday)?.day ?? null;
  const [mobileDay, setMobileDay] = useState<number>(todayDay ?? 1);

  const byDay = useMemo(() => {
    const map = new Map<number, PeriodFull[]>();
    for (const d of days) map.set(d.day, []);
    for (const p of periods) map.get(p.day)?.push(p);
    return map;
  }, [periods, days]);

  // canvas bounds: earliest start / latest end across the week, padded to the hour
  const [dayStart, dayEnd] = useMemo(() => {
    if (periods.length === 0) return [7 * 60, 16 * 60];
    let min = Infinity;
    let max = -Infinity;
    for (const p of periods) {
      if (p.start < min) min = p.start;
      if (p.end > max) max = p.end;
    }
    return [Math.floor(min / 60) * 60, Math.ceil(max / 60) * 60];
  }, [periods]);

  const total = dayEnd - dayStart;
  const hours = useMemo(() => {
    const list: number[] = [];
    for (let m = dayStart; m <= dayEnd; m += 60) list.push(m);
    return list;
  }, [dayStart, dayEnd]);

  const weekLabel =
    days.length > 0
      ? `${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(
          new Date(days[0].iso)
        )} – ${new Intl.DateTimeFormat("en-PH", { day: "numeric" }).format(
          new Date(days[days.length - 1].iso)
        )}`
      : "";

  if (periods.length === 0) {
    return (
      <div className="anim-view">
        <Toolbar title="Week" meta={<span>{weekLabel}</span>} />
        <EmptyState icon={CalendarDays} title="No schedule yet">
          Your week will fill in here once your schedule is set.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="anim-view">
      <Toolbar title="Week" meta={<span>{weekLabel}</span>}>
        {/* mobile day tabs */}
        <div role="tablist" aria-label="Day" className="grid grid-cols-5 lg:hidden">
          {days.map((d) => {
            const active = mobileDay === d.day;
            return (
              <button
                key={d.day}
                role="tab"
                aria-selected={active}
                onClick={() => setMobileDay(d.day)}
                className={cn(
                  "relative flex h-11 flex-col items-center justify-center gap-0",
                  active ? "text-ink" : "text-faint"
                )}
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em]">
                  {d.label}
                </span>
                <span
                  className={cn(
                    "tnum text-[13px] font-semibold leading-tight",
                    d.isToday && "text-brand-text"
                  )}
                >
                  {d.dateNum}
                </span>
                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>
      </Toolbar>

      {/* ------------------------------------------------ desktop grid */}
      <div className="hidden lg:block">
        <div className="sticky top-11 z-10 grid grid-cols-[48px_repeat(5,minmax(0,1fr))] border-b border-line bg-bg/95 backdrop-blur">
          <div />
          {days.map((d) => (
            <div
              key={d.day}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 border-l border-line/70",
                d.isToday ? "text-ink" : "text-muted"
              )}
            >
              <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em]">
                {d.label}
              </span>
              <span
                className={cn(
                  "tnum text-[12.5px] font-semibold",
                  d.isToday &&
                    "grid size-[22px] place-items-center rounded-full bg-brand text-[11.5px] text-on-brand"
                )}
              >
                {d.dateNum}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-[48px_repeat(5,minmax(0,1fr))] pb-4">
          {/* hour gutter */}
          <div className="relative" style={{ height: total * PX_DESKTOP }}>
            {hours.map((m) => (
              <span
                key={m}
                className="tnum absolute right-1.5 -translate-y-1/2 font-mono text-[10px] text-faint"
                style={{ top: (m - dayStart) * PX_DESKTOP }}
              >
                {fmtMin(m)}
              </span>
            ))}
          </div>

          {days.map((d) => (
            <DayColumn
              key={d.day}
              periods={byDay.get(d.day) ?? []}
              dayStart={dayStart}
              total={total}
              px={PX_DESKTOP}
              hours={hours}
              isToday={d.isToday}
              nowMin={nowMin}
              showStrand={showStrand}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ mobile day */}
      <div className="lg:hidden">
        <div className="grid grid-cols-[44px_minmax(0,1fr)] pb-6 pt-2">
          <div className="relative" style={{ height: total * PX_MOBILE }}>
            {hours.map((m) => (
              <span
                key={m}
                className="tnum absolute right-1.5 -translate-y-1/2 font-mono text-[10px] text-faint"
                style={{ top: (m - dayStart) * PX_MOBILE }}
              >
                {fmtMin(m)}
              </span>
            ))}
          </div>
          <DayColumn
            periods={byDay.get(mobileDay) ?? []}
            dayStart={dayStart}
            total={total}
            px={PX_MOBILE}
            hours={hours}
            isToday={todayDay === mobileDay}
            nowMin={nowMin}
            showStrand={showStrand}
            mobile
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- day column */

function DayColumn({
  periods,
  dayStart,
  total,
  px,
  hours,
  isToday,
  nowMin,
  showStrand,
  mobile = false,
}: {
  periods: PeriodFull[];
  dayStart: number;
  total: number;
  px: number;
  hours: number[];
  isToday: boolean;
  nowMin: number;
  showStrand: boolean;
  mobile?: boolean;
}) {
  const breaks = periods.filter((p) => p.kind === "break");
  const blocks = useMemo(
    () => layoutColumns(periods.filter((p) => p.kind !== "break")),
    [periods]
  );

  const nowVisible = isToday && nowMin >= dayStart && nowMin <= dayStart + total;

  return (
    <div
      className={cn(
        "relative border-l border-line/70",
        isToday && "bg-[color-mix(in_oklab,var(--brand)_7%,transparent)]",
        mobile && "mr-3 rounded-r-none border-r border-line/70"
      )}
      style={{ height: total * px }}
    >
      {/* hour rules */}
      {hours.map((m) => (
        <div
          key={m}
          aria-hidden
          className="absolute inset-x-0 border-t border-line/55"
          style={{ top: (m - dayStart) * px }}
        />
      ))}

      {/* breaks: full-width hatched slabs */}
      {breaks.map((p) => {
        const height = (p.end - p.start) * px;
        return (
          <div
            key={p.id}
            className="hatch absolute inset-x-0 flex items-center justify-center overflow-hidden border-y border-line/50 bg-surface/60"
            style={{ top: (p.start - dayStart) * px, height }}
          >
            {height >= 18 && (
              <span
                title={p.label ?? undefined}
                className="font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-faint"
              >
                {p.label}
              </span>
            )}
          </div>
        );
      })}

      {/* class + fixture blocks */}
      {blocks.map(({ p, col, cols }) => {
        const top = (p.start - dayStart) * px + 1;
        const height = (p.end - p.start) * px - 3;
        const gap = cols > 1 ? 2 : 3;
        const left = `calc(${(col / cols) * 100}% + ${gap}px)`;
        const width = `calc(${100 / cols}% - ${gap * 2}px)`;
        const time = `${fmtMin(p.start)}–${fmtMin(p.end)}`;

        // density tiers by pixel height
        const showTime = height >= 40;
        const showName = height >= 58 && (cols === 1 || mobile);
        const showTeacher = height >= 84 && (cols === 1 || mobile);

        if (p.kind === "fixture") {
          return (
            <div
              key={p.id}
              title={p.label ?? undefined}
              className="absolute overflow-hidden rounded-[6px] border border-dashed border-line-strong/70 bg-surface/80 px-1.5 py-1"
              style={{ top, height, left, width }}
            >
              <p className="truncate text-[10.5px] font-medium leading-tight text-muted">
                {p.label}
              </p>
              {showTime && (
                <p className="tnum mt-0.5 font-mono text-[9.5px] leading-tight text-faint">
                  {time}
                </p>
              )}
            </div>
          );
        }

        const hue = p.subject?.hue ?? "slate";
        const inner = (
          <>
            <p className="flex items-center gap-1 leading-tight">
              <span className="a-text truncate font-mono text-[10.5px] font-bold uppercase tracking-[0.02em]">
                {p.subject?.short ?? p.label}
              </span>
              {showStrand && p.strand && (
                <span className="shrink-0 rounded-[3px] bg-bg/70 px-0.5 font-mono text-[8.5px] font-semibold text-muted">
                  {p.strand}
                </span>
              )}
            </p>
            {showName && p.subject && (
              <p className="mt-0.5 truncate text-[11px] font-medium leading-tight text-ink">
                {p.subject.name}
              </p>
            )}
            {showTeacher && p.teacher && (
              <p className="mt-0.5 truncate text-[10px] leading-tight text-muted">
                {p.teacher.name}
              </p>
            )}
            {showTime && (
              <p className="tnum absolute bottom-1 left-1.5 right-1.5 truncate font-mono text-[9.5px] leading-tight text-muted">
                {time}
              </p>
            )}
          </>
        );

        const blockClass =
          "absolute overflow-hidden rounded-[6px] border a-border a-tint px-1.5 py-1 transition-colors duration-[var(--dur-1)]";

        return p.subject ? (
          <Link
            key={p.id}
            href={`/classes?c=${p.subject.id}`}
            title={p.subject.name}
            style={{ ...accentStyle(hue), top, height, left, width }}
            className={cn(blockClass, "hover:a-tint-2 hover:brightness-110 block")}
            aria-label={`${p.subject.name}, ${time}`}
          >
            {inner}
          </Link>
        ) : (
          <div key={p.id} style={{ ...accentStyle(hue), top, height, left, width }} className={blockClass}>
            {inner}
          </div>
        );
      })}

      {/* live now line */}
      {nowVisible && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10"
          style={{ top: (nowMin - dayStart) * px }}
        >
          <div className="h-[1.5px] bg-brand shadow-[0_0_6px_color-mix(in_oklab,var(--brand)_55%,transparent)]" />
          <div className="absolute -left-[3px] -top-[2.5px] size-[7px] rounded-full bg-brand" />
        </div>
      )}
    </div>
  );
}
