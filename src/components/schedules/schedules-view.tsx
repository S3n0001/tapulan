"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { CalendarBlock, CalendarFull } from "@/lib/domain/types";
import { WEEK_DAYS_MON_FIRST, blocksByDay, dayName, weeklyMinutes } from "@/lib/domain/calendar";
import { DAY_SHORT, fmtDuration, fmtMin, fmtTimeRange, minutesOf } from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/components/shell/admin-context";
import { ViewChrome } from "@/components/shell/view-chrome";
import { EmptyState } from "@/components/ui/empty";

/**
 * The Schedules view: the section's published individual calendars — a teacher's
 * timetable, a duty rota, a work roster — rendered as a proper weekly grid, the
 * same time-proportional canvas the Week view uses for classes. Admins curate
 * these behind the admin door; here they're read-only for the whole section.
 *
 * One calendar shows at a time (a pill selector switches between them). Desktop
 * gets the proportional grid; mobile folds down to a by-day agenda, which reads
 * better than a cramped seven-column canvas on a phone.
 */

// px per minute for the desktop canvas — measured to fit the panel, with a floor
// so a short block stays legible (mirrors the Week canvas). See [[week-view]].
const PX_FALLBACK = 1.2;
const MIN_PX = 1.0;
const CANVAS_PAD = 8;
// a calendar with no blocks still needs a canvas to sit on — a sane default span
const FALLBACK_START = 8 * 60;
const FALLBACK_END = 17 * 60;

interface Placed {
  block: CalendarBlock;
  col: number;
  cols: number;
}

/** Greedy interval-column layout so two blocks at the same time sit side by side. */
function layoutColumns(blocks: CalendarBlock[]): Placed[] {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
  const placed: Placed[] = [];
  let cluster: { block: CalendarBlock; col: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const cols = Math.max(...cluster.map((c) => c.col)) + 1;
    for (const c of cluster) placed.push({ block: c.block, col: c.col, cols });
    cluster = [];
    colEnds = [];
  };

  for (const b of sorted) {
    if (clusterEnd !== -1 && b.start >= clusterEnd) flush();
    let col = colEnds.findIndex((end) => end <= b.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(b.end);
    } else {
      colEnds[col] = b.end;
    }
    cluster.push({ block: b, col });
    clusterEnd = Math.max(clusterEnd, b.end);
  }
  flush();
  return placed;
}

export function SchedulesView({
  calendars,
  todayDay,
  nowISO,
}: {
  /** published individual calendars, admin-ordered */
  calendars: CalendarFull[];
  /** JS weekday (0 = Sun … 6 = Sat), Manila — the column to light up as "today" */
  todayDay: number;
  nowISO: string;
}) {
  const isAdmin = useIsAdmin();
  const [selectedId, setSelectedId] = useState<number | null>(calendars[0]?.id ?? null);
  const now = useNow(nowISO, 60_000);
  const nowMin = minutesOf(now);

  const selected =
    calendars.find((c) => c.id === selectedId) ?? calendars[0] ?? null;

  // canvas bounds + fit-to-viewport scale, measured off the scroll area
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasH, setCanvasH] = useState(0);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    setCanvasH(el.clientHeight);
    const ro = new ResizeObserver(() => setCanvasH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [dayStart, dayEnd] = useMemo(() => {
    const blocks = selected?.blocks ?? [];
    if (blocks.length === 0) return [FALLBACK_START, FALLBACK_END];
    let min = Infinity;
    let max = -Infinity;
    for (const b of blocks) {
      if (b.start < min) min = b.start;
      if (b.end > max) max = b.end;
    }
    return [Math.floor(min / 60) * 60, Math.ceil(max / 60) * 60];
  }, [selected]);
  const total = dayEnd - dayStart;
  const px = canvasH > 0 ? Math.max(MIN_PX, (canvasH - CANVAS_PAD) / total) : PX_FALLBACK;

  const hours = useMemo(() => {
    const list: number[] = [];
    for (let m = dayStart; m <= dayEnd; m += 60) list.push(m);
    return list;
  }, [dayStart, dayEnd]);

  // weekends only earn columns when the calendar actually uses them, so a plain
  // Mon–Fri roster stays compact instead of trailing two empty day columns
  const showWeekend = useMemo(
    () => (selected?.blocks ?? []).some((b) => b.day === 0 || b.day === 6),
    [selected]
  );
  const days = showWeekend ? [...WEEK_DAYS_MON_FIRST] : [1, 2, 3, 4, 5];

  const byDay = useMemo(() => {
    const map = new Map<number, CalendarBlock[]>();
    for (const b of selected?.blocks ?? []) {
      (map.get(b.day) ?? map.set(b.day, []).get(b.day)!).push(b);
    }
    return map;
  }, [selected]);

  const agenda = useMemo(() => blocksByDay(selected?.blocks ?? []), [selected]);

  if (calendars.length === 0 || !selected) {
    return (
      <ViewChrome title="Schedules" icon={CalendarClock}>
        <EmptyState
          icon={CalendarClock}
          title="No shared schedules yet"
          fill
          action={
            isAdmin ? (
              <Link
                href="/admin"
                className="inline-flex h-7 items-center gap-1.5 rounded-[var(--r-control)] border border-line bg-surface px-2.5 text-[12.5px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-surface-2"
              >
                Open the admin panel
              </Link>
            ) : undefined
          }
        >
          {isAdmin
            ? "Add a personal calendar under Admin › Calendars — a duty rota, someone’s timetable, your office hours — then mark it visible to share it here."
            : "Your section’s admins can post personal calendars — a duty rota, a teacher’s timetable — and they’ll show up here."}
        </EmptyState>
      </ViewChrome>
    );
  }

  const load = weeklyLoad(selected.blocks);
  const meta = [selected.subtitle, load].filter(Boolean).join(" · ");

  return (
    <ViewChrome
      title="Schedules"
      icon={CalendarClock}
      meta={meta ? <span className="truncate">{meta}</span> : undefined}
      subrow={
        calendars.length > 1 ? (
          <div className="flex gap-1 overflow-x-auto px-3.5 pb-0.5 lg:px-4">
            {calendars.map((cal) => {
              const active = cal.id === selected.id;
              return (
                <button
                  key={cal.id}
                  type="button"
                  onClick={() => setSelectedId(cal.id)}
                  aria-pressed={active}
                  style={accentStyle(cal.hue)}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors duration-[var(--dur-1)]",
                    active
                      ? "a-tint a-border text-ink"
                      : "border-line text-muted hover:bg-surface hover:text-ink"
                  )}
                >
                  <span className="a-dot size-2 shrink-0 rounded-full" aria-hidden />
                  <span className="truncate">{cal.name}</span>
                </button>
              );
            })}
          </div>
        ) : undefined
      }
    >
      {/* single calendar: name it, since there's no selector row carrying it */}
      {calendars.length === 1 && (
        <div className="flex items-center gap-2 border-b border-line px-3.5 py-2 lg:px-4">
          <span
            style={accentStyle(selected.hue)}
            className="a-dot size-2.5 shrink-0 rounded-full"
            aria-hidden
          />
          <span className="truncate text-[13.5px] font-semibold text-ink">{selected.name}</span>
        </div>
      )}

      {selected.blocks.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Nothing scheduled yet" fill>
          This calendar doesn’t have any blocks on it right now.
        </EmptyState>
      ) : (
        <>
          {/* ------------------------------------------------ desktop grid */}
          <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
            <div
              className="grid shrink-0"
              style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0,1fr))` }}
            >
              <div />
              {days.map((d) => {
                const isToday = d === todayDay;
                return (
                  <div
                    key={d}
                    className={cn(
                      "flex items-center justify-center border-l border-line/70 py-2",
                      isToday && "bg-[color-mix(in_oklab,var(--brand)_6%,transparent)]"
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
                        isToday ? "text-brand-text" : "text-faint"
                      )}
                    >
                      {DAY_SHORT[d]}
                    </span>
                  </div>
                );
              })}
            </div>

            <div ref={canvasRef} className="min-h-0 flex-1 overflow-y-auto">
              <div
                className="grid pb-2"
                style={{ gridTemplateColumns: `48px repeat(${days.length}, minmax(0,1fr))` }}
              >
                {/* hour gutter */}
                <div className="relative" style={{ height: total * px }}>
                  {hours.map((m) => (
                    <span
                      key={m}
                      className={cn(
                        "tnum absolute right-1.5 font-mono text-[10px] text-faint",
                        m !== dayStart && "-translate-y-1/2"
                      )}
                      style={{ top: (m - dayStart) * px }}
                    >
                      {fmtMin(m)}
                    </span>
                  ))}
                </div>

                {days.map((d) => (
                  <DayColumn
                    key={d}
                    hue={selected.hue}
                    blocks={byDay.get(d) ?? []}
                    dayStart={dayStart}
                    total={total}
                    px={px}
                    isToday={d === todayDay}
                    nowMin={nowMin}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ------------------------------------------------ mobile agenda */}
          <div className="divide-y divide-line/60 lg:hidden">
            {agenda.map((group) => {
              const isToday = group.day === todayDay;
              return (
                <section key={group.day} className="px-3.5 py-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <h2
                      className={cn(
                        "font-mono text-[11px] font-semibold uppercase tracking-[0.06em]",
                        isToday ? "text-brand-text" : "text-muted"
                      )}
                    >
                      {dayName(group.day)}
                    </h2>
                    {isToday && (
                      <span className="rounded-full bg-[color-mix(in_oklab,var(--brand)_16%,var(--bg))] px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.04em] text-brand-text">
                        Today
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {group.blocks.map((block) => (
                      <li
                        key={block.id}
                        style={accentStyle(selected.hue)}
                        className="a-tint a-border flex items-baseline gap-2.5 rounded-[var(--r-card)] border px-2.5 py-2"
                      >
                        <span className="tnum w-[104px] shrink-0 font-mono text-[11.5px] text-muted">
                          {fmtTimeRange(block.start, block.end)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-ink">
                            {block.label}
                          </span>
                          {block.note && (
                            <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                              {block.note}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
    </ViewChrome>
  );
}

/** "12h 30m/wk" — a calendar's weekly load, or "" when it's empty. */
function weeklyLoad(blocks: CalendarBlock[]): string {
  const mins = weeklyMinutes(blocks);
  return mins > 0 ? `${fmtDuration(mins)}/wk` : "";
}

/* ---------------------------------------------------------- day column */

function DayColumn({
  hue,
  blocks,
  dayStart,
  total,
  px,
  isToday,
  nowMin,
}: {
  hue: string;
  blocks: CalendarBlock[];
  dayStart: number;
  total: number;
  px: number;
  isToday: boolean;
  nowMin: number;
}) {
  const placed = useMemo(() => layoutColumns(blocks), [blocks]);
  const dayEnd = dayStart + total;
  const nowVisible = isToday && nowMin >= dayStart && nowMin <= dayEnd;

  return (
    <div
      className="relative border-l border-line/70"
      style={{ height: total * px }}
    >
      {isToday && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-2 top-0 bg-[color-mix(in_oklab,var(--brand)_7%,transparent)]"
        />
      )}

      {placed.map(({ block, col, cols }) => {
        const top = (block.start - dayStart) * px + 1;
        const height = (block.end - block.start) * px - 3;
        const gap = cols > 1 ? 2 : 3;
        const left = `calc(${(col / cols) * 100}% + ${gap}px)`;
        const width = `calc(${100 / cols}% - ${gap * 2}px)`;
        const compact = height < 38;
        const showTime = height >= 44;
        const showNote = height >= 62 && cols === 1 && !!block.note;

        return (
          <div
            key={block.id}
            title={block.note ? `${block.label} · ${block.note}` : block.label}
            style={{ ...accentStyle(hue), top, height, left, width }}
            className={cn(
              "absolute flex flex-col overflow-hidden rounded-[6px] border a-border a-tint px-1.5",
              compact ? "justify-center py-0" : "py-1"
            )}
          >
            <p
              className={cn(
                "font-semibold leading-tight text-ink",
                compact ? "truncate text-[10.5px]" : "line-clamp-2 text-[11px]"
              )}
            >
              {block.label}
            </p>
            {showNote && (
              <p className="mt-0.5 truncate text-[10px] leading-tight text-muted">{block.note}</p>
            )}
            {showTime && (
              <p className="tnum absolute bottom-1 left-1.5 right-1.5 truncate font-mono text-[9.5px] leading-tight text-muted">
                {fmtMin(block.start)}–{fmtMin(block.end)}
              </p>
            )}
          </div>
        );
      })}

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
