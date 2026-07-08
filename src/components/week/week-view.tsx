"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { taskSubjectIds, type DayMark, type PeriodFull, type TaskFull } from "@/lib/domain/types";
import { minutesOf, fmtMin, fromISODate } from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { DAY_MARK_HUE, DAY_MARK_SHORT, dayMarkTitle } from "@/lib/domain/day-mark";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { ViewChrome } from "@/components/shell/view-chrome";
import { EmptyState } from "@/components/ui/empty";
import { DueFlag } from "@/components/tasks/due-flag";
import { useClassDetail } from "@/components/classes/class-detail";

/** Key a task onto the class meeting it belongs to: `dueDate#subjectId`. */
const dueKey = (iso: string, subjectId: number) => `${iso}#${subjectId}`;

/**
 * The week canvas: a true time-proportional grid. Five columns on desktop,
 * one swappable day on mobile — same block renderer, different scale.
 * Blocks are data-colored (subject hue), breaks and fixtures share the same
 * dashed-band treatment, and a cobalt line tracks the current minute through
 * today's column.
 */

// px per minute. On desktop the scale is fluid: the canvas measures itself
// and picks whatever px/min fits the whole week in the viewport — clamped
// both ways. The MIN floor keeps a 15-min homeroom readable (below it the
// canvas scrolls instead of squishing); the MAX ceiling stops a tall monitor
// from ballooning a 90-min class into a near-empty slab (it just leaves slack
// at the bottom instead). Mobile keeps a fixed, taller scale since one day
// owns the full width and vertical scroll is natural there.
const PX_DESKTOP_FALLBACK = 1.2; // pre-measure / SSR — a typical fitted value
const MIN_PX_DESKTOP = 1.0;
const MAX_PX_DESKTOP = 1.25;
const PX_MOBILE = 1.8;
// breathing room above/below the canvas so half-height hour labels survive
const CANVAS_PAD = 16;

export interface WeekDay {
  /** 1 = Monday … 5 = Friday */
  day: number;
  iso: string;
  /** "MON" */
  label: string;
  /** 6 */
  dateNum: number;
  isToday: boolean;
  /** async / no-class override for this date, if any */
  mark: DayMark | null;
  /** open requirements due on this date */
  dueCount: number;
  /** the date is already past — its open work reads as overdue */
  overdue: boolean;
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
  tasks,
  weekOffset,
  nowISO,
  showStrand,
}: {
  periods: PeriodFull[];
  days: WeekDay[];
  /** still-open requirements across the strand — pinned onto their class block */
  tasks: TaskFull[];
  /** 0 = this week, ±n = weeks away (the ?w= param) */
  weekOffset: number;
  nowISO: string;
  showStrand: boolean;
}) {
  const now = useNow(nowISO, 60_000);
  const nowMin = minutesOf(now);

  // tasks pinned to the meeting they belong to — keyed by due date × subject,
  // so a block on that date for that subject can surface its own requirements
  const tasksByKey = useMemo(() => {
    const map = new Map<string, TaskFull[]>();
    for (const t of tasks) {
      // a collab requirement pins onto both of its class meetings
      for (const id of taskSubjectIds(t)) {
        const key = dueKey(t.dueDate, id);
        (map.get(key) ?? map.set(key, []).get(key)!).push(t);
      }
    }
    return map;
  }, [tasks]);

  const todayDay = days.find((d) => d.isToday)?.day ?? null;
  const [mobileDay, setMobileDay] = useState<number>(todayDay ?? 1);
  const mobileMark = days.find((d) => d.day === mobileDay)?.mark ?? null;

  // horizontal swipe between days on the mobile canvas
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    setMobileDay((d) => Math.min(5, Math.max(1, d + (dx < 0 ? 1 : -1))));
  };

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

  // fit-to-viewport scale: measure the desktop canvas, derive px/min
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasH, setCanvasH] = useState(0);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    // measure synchronously so the first paint is already fitted; the
    // observer only has to track resizes from there
    setCanvasH(el.clientHeight);
    const ro = new ResizeObserver(() => setCanvasH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const pxDesktop =
    canvasH > 0
      ? Math.min(
          MAX_PX_DESKTOP,
          Math.max(MIN_PX_DESKTOP, (canvasH - CANVAS_PAD) / total)
        )
      : PX_DESKTOP_FALLBACK;

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let m = dayStart; m <= dayEnd; m += 60) list.push(m);
    return list;
  }, [dayStart, dayEnd]);

  const weekLabel =
    days.length > 0
      ? `${new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(
          fromISODate(days[0].iso)
        )} – ${new Intl.DateTimeFormat("en-PH", { day: "numeric" }).format(
          fromISODate(days[days.length - 1].iso)
        )}`
      : "";

  const relLabel = weekLabel;

  const weekNav = (
    <div className="flex items-center gap-0.5">
      {weekOffset !== 0 && (
        <Link
          href="/week"
          className="tap mr-1 rounded-[var(--r-chip)] px-2 py-1 font-mono text-[11px] font-medium text-faint transition-colors hover:text-ink"
        >
          This week
        </Link>
      )}
      <Link
        href={`/week?w=${weekOffset - 1}`}
        aria-label="Previous week"
        className="tap grid size-7 place-items-center rounded-[var(--r-control)] text-muted transition-[color,background-color] hover:bg-surface-2 hover:text-ink"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <Link
        href={`/week?w=${weekOffset + 1}`}
        aria-label="Next week"
        className="tap grid size-7 place-items-center rounded-[var(--r-control)] text-muted transition-[color,background-color] hover:bg-surface-2 hover:text-ink"
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );

  if (periods.length === 0) {
    return (
      <ViewChrome
        title="Week"
        icon={CalendarDays}
        meta={<span className="tnum">{relLabel}</span>}
        right={weekNav}
      >
        <EmptyState icon={CalendarDays} title="No schedule yet">
          Your week will fill in here once your schedule is set.
        </EmptyState>
      </ViewChrome>
    );
  }

  return (
    <ViewChrome
      title="Week"
      icon={CalendarDays}
      meta={<span className="tnum">{relLabel}</span>}
      right={weekNav}
      mobileSubrow={
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
                {(d.mark || d.dueCount > 0) && (
                  <span className="mt-0.5 flex items-center gap-1">
                    {d.mark && (
                      <span
                        style={accentStyle(DAY_MARK_HUE[d.mark.kind])}
                        className="a-dot size-1 rounded-full"
                        aria-hidden
                      />
                    )}
                    <DueChip count={d.dueCount} overdue={d.overdue} />
                  </span>
                )}
                {active && (
                  <span className="anim-underline absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>
      }
    >

      {/* ------------------------------------------------ desktop grid */}
      <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <div className="grid shrink-0 grid-cols-[48px_repeat(5,minmax(0,1fr))] border-b border-line bg-bg/95">
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
              {d.mark && (
                <span
                  style={accentStyle(DAY_MARK_HUE[d.mark.kind])}
                  className="a-text a-tint-2 rounded-[3px] px-1 py-px font-mono text-[8.5px] font-semibold uppercase tracking-[0.04em]"
                >
                  {DAY_MARK_SHORT[d.mark.kind]}
                </span>
              )}
              <DueChip count={d.dueCount} overdue={d.overdue} />
            </div>
          ))}
        </div>

        <div ref={canvasRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-[48px_repeat(5,minmax(0,1fr))] py-2">
            {/* hour gutter */}
            <div className="relative" style={{ height: total * pxDesktop }}>
              {hours.map((m) => (
                <span
                  key={m}
                  className="tnum absolute right-1.5 -translate-y-1/2 font-mono text-[10px] text-faint"
                  style={{ top: (m - dayStart) * pxDesktop }}
                >
                  {fmtMin(m)}
                </span>
              ))}
              <NowChip
                visible={todayDay !== null}
                nowMin={nowMin}
                dayStart={dayStart}
                dayEnd={dayEnd}
                px={pxDesktop}
              />
            </div>

            {days.map((d) => (
              <DayColumn
                key={d.day}
                periods={byDay.get(d.day) ?? []}
                dayStart={dayStart}
                total={total}
                px={pxDesktop}
                hours={hours}
                isToday={d.isToday}
                nowMin={nowMin}
                showStrand={showStrand}
                mark={d.mark}
                iso={d.iso}
                tasksByKey={tasksByKey}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------ mobile day */}
      <div className="lg:hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {mobileMark && (
          <div
            key={`mark-${mobileDay}`}
            style={accentStyle(DAY_MARK_HUE[mobileMark.kind])}
            className="anim-fade a-tint a-border flex items-center gap-2 border-b px-3.5 py-2"
          >
            <span className="a-text font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
              {DAY_MARK_SHORT[mobileMark.kind]}
            </span>
            <span className="truncate text-[12px] text-muted">
              {dayMarkTitle(mobileMark)}
              {mobileMark.kind === "async" && " · no in-person class"}
            </span>
          </div>
        )}
        {/* keyed on the day so switching (tap or swipe) crossfades the canvas */}
        <div key={mobileDay} className="anim-fade grid grid-cols-[44px_minmax(0,1fr)] pb-6 pt-2">
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
            <NowChip
              visible={todayDay === mobileDay}
              nowMin={nowMin}
              dayStart={dayStart}
              dayEnd={dayEnd}
              px={PX_MOBILE}
            />
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
            mark={mobileMark}
            iso={days.find((d) => d.day === mobileDay)?.iso ?? ""}
            tasksByKey={tasksByKey}
            mobile
          />
        </div>
      </div>
    </ViewChrome>
  );
}

/* ------------------------------------------------------------ due chip */

/** The "N due" count on a day header — danger-tinted once the day is past. */
function DueChip({
  count,
  overdue,
  className,
}: {
  count: number;
  overdue: boolean;
  className?: string;
}) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} due`}
      className={cn(
        "tnum rounded-full px-1 font-mono text-[9px] font-semibold leading-[14px]",
        overdue
          ? "bg-[color-mix(in_oklab,var(--danger)_20%,var(--bg))] text-danger-text"
          : "bg-[color-mix(in_oklab,var(--brand)_18%,var(--bg))] text-brand-text",
        className
      )}
    >
      {count}
    </span>
  );
}

/* ------------------------------------------------------------ now chip */

/**
 * The current time, pinned to the hour gutter in cobalt and gliding with
 * the now-line — the axis label Notion-style calendars hang on "now".
 */
function NowChip({
  visible,
  nowMin,
  dayStart,
  dayEnd,
  px,
}: {
  visible: boolean;
  nowMin: number;
  dayStart: number;
  dayEnd: number;
  px: number;
}) {
  if (!visible || nowMin < dayStart) return null;
  // still today but past the last period — pin the chip to the bottom edge
  // instead of hiding it, so "now" doesn't just vanish once school lets out
  const clampedMin = Math.min(nowMin, dayEnd);
  return (
    <span
      aria-hidden
      className="tnum absolute right-1 z-10 -translate-y-1/2 rounded-[4px] bg-brand px-1 py-px font-mono text-[9px] font-semibold leading-[13px] text-on-brand transition-[top] duration-500 ease-linear"
      style={{ top: (clampedMin - dayStart) * px }}
    >
      {fmtMin(nowMin)}
    </span>
  );
}

/* ----------------------------------------------------------- slim band */

/**
 * A break or fixture too short to render as a legible band — e.g. a 10-min
 * Afternoon Break, which at the desktop scale is only ~8px tall and would
 * clip its own label to an unreadable sliver. Instead of squeezing text into
 * the slot, we float the label as a centered pill straddling it, lifted above
 * the class blocks with a background halo so it reads as a clean divider
 * between the class that ends and the one that begins.
 */
function SlimBand({
  top,
  height,
  label,
  past,
  style,
}: {
  top: number;
  height: number;
  label: string | null;
  past: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="pointer-events-none absolute z-[8] flex -translate-y-1/2 justify-center"
      style={{ top: top + height / 2, ...style }}
    >
      <span
        title={label ?? undefined}
        className={cn(
          "pointer-events-auto max-w-full truncate rounded-full border border-dashed border-line-strong/70 bg-surface px-2 py-[3px] text-[9.5px] font-medium leading-none text-muted shadow-[0_0_0_4px_var(--bg)] transition-opacity duration-[var(--dur-2)]",
          past && "opacity-55"
        )}
      >
        {label}
      </span>
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
  mark = null,
  iso,
  tasksByKey,
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
  mark?: DayMark | null;
  /** this column's calendar date (YYYY-MM-DD) — to look up its tasks */
  iso: string;
  /** requirements keyed by `dueDate#subjectId` */
  tasksByKey: Map<string, TaskFull[]>;
  mobile?: boolean;
}) {
  const { openClass } = useClassDetail();
  const noClass = mark?.kind === "no_class";
  const breaks = periods.filter((p) => p.kind === "break");
  const blocks = useMemo(
    () => layoutColumns(periods.filter((p) => p.kind !== "break")),
    [periods]
  );

  // a marked day has nothing "live" — the now-line would imply a running class.
  // Once nowMin runs past the bottom of the canvas it's still pinned there
  // (clamped below) rather than disappearing — see the `top` calc.
  const nowVisible = isToday && !mark && nowMin >= dayStart;

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

      {/* breaks: full-width dashed bands, same treatment as fixtures */}
      {!noClass && breaks.map((p) => {
        const top = (p.start - dayStart) * px + 1;
        const height = (p.end - p.start) * px - 3;
        const past = isToday && p.end <= nowMin;
        // too short for a legible band — float the label as a centered pill
        if (height < 16) {
          return (
            <SlimBand
              key={p.id}
              top={top}
              height={height}
              label={p.label}
              past={past}
              style={{ left: 3, right: 3 }}
            />
          );
        }
        const compact = height < 38;
        const showTime = height >= 44;
        const time = `${fmtMin(p.start)}–${fmtMin(p.end)}`;
        return (
          <div
            key={p.id}
            title={p.label ?? undefined}
            className={cn(
              "absolute inset-x-[3px] flex flex-col overflow-hidden rounded-[6px] border border-dashed border-line-strong/70 bg-surface/80 px-1.5 transition-opacity duration-[var(--dur-2)]",
              compact ? "justify-center py-0" : "py-1",
              past && "opacity-55"
            )}
            style={{ top, height }}
          >
            <p
              className={cn(
                "font-medium leading-tight text-muted",
                compact ? "truncate text-[10px]" : "line-clamp-2 text-[10.5px]"
              )}
            >
              {p.label}
            </p>
            {showTime && (
              <p className="tnum mt-0.5 font-mono text-[9.5px] leading-tight text-faint">
                {time}
              </p>
            )}
          </div>
        );
      })}

      {/* class + fixture blocks */}
      {!noClass && blocks.map(({ p, col, cols }) => {
        const top = (p.start - dayStart) * px + 1;
        const height = (p.end - p.start) * px - 3;
        const gap = cols > 1 ? 2 : 3;
        const left = `calc(${(col / cols) * 100}% + ${gap}px)`;
        const width = `calc(${100 / cols}% - ${gap * 2}px)`;
        const time = `${fmtMin(p.start)}–${fmtMin(p.end)}`;
        // today's finished periods recede, like the Today timeline
        const past = isToday && p.end <= nowMin;

        // Density tiers by pixel height — each line is only rendered when the
        // block is genuinely tall enough for it, so short slots never overflow.
        // `solo` = the slot isn't shared with a parallel strand column.
        const solo = cols === 1 || mobile;
        const compact = height < 38; // too short to stack — center one line
        const showTime = height >= 44;
        const showName = height >= 62 && solo;
        const showTeacher = height >= 92 && solo;

        if (p.kind === "fixture") {
          if (height < 16) {
            return (
              <SlimBand
                key={p.id}
                top={top}
                height={height}
                label={p.label}
                past={past}
                style={{ left, width }}
              />
            );
          }
          return (
            <div
              key={p.id}
              title={p.label ?? undefined}
              className={cn(
                "absolute flex flex-col overflow-hidden rounded-[6px] border border-dashed border-line-strong/70 bg-surface/80 px-1.5 transition-opacity duration-[var(--dur-2)]",
                compact ? "justify-center py-0" : "py-1",
                past && "opacity-55"
              )}
              style={{ top, height, left, width }}
            >
              <p
                className={cn(
                  "font-medium leading-tight text-muted",
                  compact ? "truncate text-[10px]" : "line-clamp-2 text-[10.5px]"
                )}
              >
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
        const dueTasks =
          p.subjectId !== null ? (tasksByKey.get(dueKey(iso, p.subjectId)) ?? []) : [];
        const inner = (
          <>
            <p className="flex items-center gap-1 leading-tight">
              <span className="a-text truncate font-mono text-[10.5px] font-bold uppercase tracking-[0.02em]">
                {p.subject?.short ?? p.label}
              </span>
              {showStrand && p.strand && solo && (
                <span className="shrink-0 rounded-[3px] bg-bg/70 px-0.5 font-mono text-[8.5px] font-semibold text-muted">
                  {p.strand}
                </span>
              )}
              <DueFlag tasks={dueTasks} className="ml-auto" />
            </p>
            {/* narrow split columns: strand on its own line so a long code
                (e.g. PHYSICS) keeps full width instead of truncating behind
                the badge */}
            {showStrand && p.strand && !solo && (
              <p className="mt-0.5 leading-none">
                <span className="rounded-[3px] bg-bg/70 px-1 py-px font-mono text-[8.5px] font-semibold text-muted">
                  {p.strand}
                </span>
              </p>
            )}
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

        const blockClass = cn(
          "absolute flex flex-col overflow-hidden rounded-[6px] border a-border a-tint px-1.5",
          compact ? "justify-center py-0" : "py-1",
          "transition-[background-color,border-color,box-shadow,opacity] duration-[var(--dur-1)]",
          past && "opacity-60"
        );

        const subj = p.subject;
        return subj ? (
          <button
            key={p.id}
            type="button"
            onClick={() => openClass(subj.id)}
            title={subj.name}
            style={{ ...accentStyle(hue), top, height, left, width }}
            className={cn(
              blockClass,
              "cursor-pointer text-left hover:a-tint-2 hover:a-ring hover:opacity-100"
            )}
            aria-label={`${subj.name}, ${time}`}
          >
            {inner}
          </button>
        ) : (
          <div key={p.id} style={{ ...accentStyle(hue), top, height, left, width }} className={blockClass}>
            {inner}
          </div>
        );
      })}

      {/* async wash / no-class slab */}
      {mark && <MarkOverlay mark={mark} />}

      {/* live now line — glides on the minute tick instead of jumping.
          Past the bottom of the canvas (school day over) it pins to the
          bottom edge instead of disappearing. */}
      {nowVisible && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 z-10 transition-[top] duration-500 ease-linear"
          style={{ top: Math.min(nowMin - dayStart, total) * px }}
        >
          <div className="h-[1.5px] bg-brand shadow-[0_0_6px_color-mix(in_oklab,var(--brand)_55%,transparent)]" />
          <div className="absolute -left-[3px] -top-[2.5px] size-[7px] rounded-full bg-brand" />
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- mark overlay */

/**
 * The day-mark treatment laid over a week column: a hatched "No class" slab
 * that stands in for the blanked schedule, or a faint wash that tints an
 * async day so it reads as different without hiding its subjects.
 */
function MarkOverlay({ mark }: { mark: DayMark }) {
  if (mark.kind === "no_class") {
    return (
      <div
        style={accentStyle(DAY_MARK_HUE.no_class)}
        className="hatch absolute inset-[3px] z-[6] flex flex-col items-center justify-center gap-1 rounded-[6px] border border-dashed border-line-strong/70 bg-surface/75 px-2 text-center"
      >
        <span className="a-text font-mono text-[11px] font-semibold uppercase tracking-[0.06em]">
          No class
        </span>
        {mark.label && (
          <span className="line-clamp-3 text-[10.5px] leading-tight text-muted">{mark.label}</span>
        )}
      </div>
    );
  }
  return (
    <div
      aria-hidden
      style={accentStyle(DAY_MARK_HUE.async)}
      className="pointer-events-none absolute inset-0 z-[4] bg-[color-mix(in_oklab,var(--a)_8%,transparent)]"
    />
  );
}
