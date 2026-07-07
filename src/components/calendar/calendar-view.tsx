"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight } from "lucide-react";
import type { DayMark, StrandCode, TaskFull } from "@/lib/domain/types";
import { isActionable } from "@/lib/domain/tasks";
import {
  addDays,
  addMonths,
  daysUntil,
  fmtDateLong,
  fmtDateMed,
  fmtDateShort,
  fmtMin,
  fmtMinAmPm,
  fmtMonthYear,
  fromISODate,
  isPastDue,
  monthKeyOf,
  startOfMonth,
  toISODate,
} from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { DAY_MARK_HUE, DAY_MARK_SHORT, dayMarkTitle } from "@/lib/domain/day-mark";
import { useNow } from "@/hooks/use-now";
import { useDone } from "@/hooks/use-done";
import { usePresence } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";
import { Toolbar } from "@/components/shell/toolbar";
import { HueBadge } from "@/components/ui/badge";
import { TaskListRow } from "@/components/tasks/task-list-row";
import { TaskPanel } from "@/components/tasks/task-panel";

/**
 * The month canvas — a real calendar, not an agenda. Desktop is a full-bleed
 * Monday-first grid that fills the panel: hairline cells, deadline chips
 * colored by task type, day-mark bands (async wash / hatched no-class, same
 * vocabulary as the week canvas), cobalt today, danger for overdue-but-open.
 * Overflow days open a per-day popover. Mobile is a compact dot grid over a
 * selected-day agenda. Read-only: chips open the shared task panel.
 */

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const WEEK_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;

// desktop cell budget: number row ≈ 24px + 4px breathing room; each content
// unit (chip / mark band / "+n more") ≈ 20px including its gap
const CELL_HEAD_PX = 28;
const UNIT_PX = 20;
const FALLBACK_ROW_PX = 132; // pre-measure / SSR — a typical fitted row

interface MonthDay {
  iso: string;
  dateNum: number;
  /** 0 = Monday … 6 = Sunday */
  col: number;
  inMonth: boolean;
  isToday: boolean;
  weekend: boolean;
  /** strictly before today — content recedes, open work reads overdue */
  past: boolean;
  mark: DayMark | null;
  tasks: TaskFull[];
}

/** Settled one way or another — struck out and receded, never alarming. */
function isHandled(t: TaskFull, personalDone: boolean): boolean {
  return personalDone || t.doneInClass || t.status === "done" || t.status === "cancelled";
}

/** Open work first (in due-time order), handled work sinks to the bottom. */
function orderDay(tasks: TaskFull[], isDone: (id: number) => boolean): TaskFull[] {
  const open: TaskFull[] = [];
  const handled: TaskFull[] = [];
  for (const t of tasks) (isHandled(t, isDone(t.id)) ? handled : open).push(t);
  return [...open, ...handled];
}

/** "Today" · "Tomorrow" · "in 3d" · "2d ago" — the chip beside a date. */
function relDay(iso: string, now: Date): string {
  const d = daysUntil(iso, now);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "1d ago";
  return d > 0 ? `in ${d}d` : `${-d}d ago`;
}

export function CalendarView({
  tasks,
  marks,
  strand,
  initialMonth,
  nowISO,
}: {
  tasks: TaskFull[];
  marks: DayMark[];
  strand: StrandCode | null;
  /** validated "YYYY-MM" from ?m=, or null for the current month */
  initialMonth: string | null;
  nowISO: string;
}) {
  const now = useNow(nowISO, 60_000);
  const router = useRouter();
  const { isDone, toggle } = useDone();
  const todayISO = toISODate(now);
  const nowKey = todayISO.slice(0, 7);

  const [month, setMonth] = useState<Date>(() =>
    initialMonth ? fromISODate(`${initialMonth}-01`) : startOfMonth(new Date(nowISO))
  );
  const key = monthKeyOf(month);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  // the day the mobile agenda shows — today when visible, else the 1st
  const [dayISO, setDayISO] = useState<string>(() =>
    todayISO.slice(0, 7) === key ? todayISO : `${key}-01`
  );

  // per-day overflow popover (desktop)
  const [pop, setPop] = useState<{ iso: string; left: number; top: number } | null>(null);
  const [popOpen, setPopOpen] = useState(false);
  const popRestore = useRef<HTMLElement | null>(null);

  // keep ?m= shareable without a server roundtrip per page
  useEffect(() => {
    const url =
      key === nowKey
        ? window.location.pathname
        : `${window.location.pathname}?m=${key}`;
    window.history.replaceState(window.history.state, "", url);
  }, [key, nowKey]);

  // paging months resets the popover and the mobile day selection
  const prevKey = useRef(key);
  useEffect(() => {
    if (prevKey.current === key) return;
    prevKey.current = key;
    setPopOpen(false);
    setDayISO(todayISO.slice(0, 7) === key ? todayISO : `${key}-01`);
  }, [key, todayISO]);

  const byDate = useMemo(() => {
    const map = new Map<string, TaskFull[]>();
    for (const t of tasks) (map.get(t.dueDate) ?? map.set(t.dueDate, []).get(t.dueDate)!).push(t);
    return map;
  }, [tasks]);

  const markMap = useMemo(() => new Map(marks.map((m) => [m.date, m])), [marks]);

  // exact weeks of the month, Monday-first — leading/trailing days included
  const { days, weeks } = useMemo(() => {
    const lead = (month.getDay() + 6) % 7;
    const start = addDays(month, -lead);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const weeks = Math.ceil((lead + daysInMonth) / 7);
    const days: MonthDay[] = [];
    for (let i = 0; i < weeks * 7; i++) {
      const date = addDays(start, i);
      const iso = toISODate(date);
      days.push({
        iso,
        dateNum: date.getDate(),
        col: i % 7,
        inMonth: date.getMonth() === month.getMonth(),
        isToday: iso === todayISO,
        weekend: i % 7 >= 5,
        past: iso < todayISO,
        mark: markMap.get(iso) ?? null,
        tasks: byDate.get(iso) ?? [],
      });
    }
    return { days, weeks };
  }, [month, byDate, markMap, todayISO]);

  const dayByIso = useMemo(() => new Map(days.map((d) => [d.iso, d])), [days]);

  // toolbar meta — open work in the labeled month, split honest/overdue
  const { dueCount, lateCount } = useMemo(() => {
    let due = 0;
    let late = 0;
    for (const t of tasks) {
      if (!t.dueDate.startsWith(key) || !isActionable(t) || isDone(t.id)) continue;
      if (isPastDue(t.dueDate, t.dueTime, now)) late++;
      else due++;
    }
    return { dueCount: due, lateCount: late };
  }, [tasks, key, isDone, now]);

  // fit chips to the measured row height (week-canvas pattern)
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridH, setGridH] = useState(0);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    setGridH(el.clientHeight);
    const ro = new ResizeObserver(() => setGridH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const rowH = gridH > 0 ? gridH / weeks : FALLBACK_ROW_PX;
  const units = Math.max(1, Math.floor((rowH - CELL_HEAD_PX) / UNIT_PX));

  const openTask = (id: number) => setSelectedId(id);
  const selected = selectedId !== null ? (tasks.find((t) => t.id === selectedId) ?? null) : null;

  const openPop = (iso: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    popRestore.current = e.currentTarget;
    setPop({
      iso,
      left: Math.max(8, Math.min(r.left, window.innerWidth - 312)),
      top: Math.max(8, Math.min(r.top - 4, window.innerHeight - 408)),
    });
    setPopOpen(true);
  };
  const closePop = () => {
    setPopOpen(false);
    popRestore.current?.focus?.({ preventScroll: true });
  };

  // horizontal swipe between months on the mobile grid
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
    setMonth((m) => addMonths(m, dx < 0 ? 1 : -1));
  };

  const controls = (
    <div className="flex items-center gap-1.5">
      <a
        href={`/api/ics${strand ? `?strand=${strand}` : ""}`}
        title="Subscribe in your calendar app"
        className="tap flex items-center gap-1 rounded-[var(--r-chip)] px-2 py-1 font-mono text-[11px] font-medium text-faint transition-colors hover:text-ink"
      >
        <CalendarPlus className="size-3.5" />
        <span className="hidden sm:inline">Subscribe</span>
      </a>
      <span className="h-4 w-px bg-line-strong" aria-hidden />
      <div className="flex items-center gap-0.5">
        {key !== nowKey && (
          <button
            type="button"
            onClick={() => setMonth(startOfMonth(now))}
            className="tap mr-1 rounded-[var(--r-chip)] px-2 py-1 font-mono text-[11px] font-medium text-faint transition-colors hover:text-ink"
          >
            This month
          </button>
        )}
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setMonth((m) => addMonths(m, -1))}
          className="tap grid size-7 place-items-center rounded-[var(--r-control)] text-muted transition-[color,background-color] hover:bg-surface-2 hover:text-ink"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth((m) => addMonths(m, 1))}
          className="tap grid size-7 place-items-center rounded-[var(--r-control)] text-muted transition-[color,background-color] hover:bg-surface-2 hover:text-ink"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );

  const selectedDay = dayByIso.get(dayISO) ?? null;
  const agendaTasks = selectedDay ? orderDay(selectedDay.tasks, isDone) : [];
  const agendaOpen = agendaTasks.filter((t) => !isHandled(t, isDone(t.id))).length;

  return (
    <div className="anim-view flex flex-col lg:h-full lg:min-h-0">
      <Toolbar
        title="Calendar"
        meta={
          <>
            <span className="font-medium text-ink">{fmtMonthYear(month)}</span>
            <span>{dueCount} due</span>
            {lateCount > 0 && <span className="text-danger-text">{lateCount} overdue</span>}
          </>
        }
        right={controls}
        className="shrink-0"
      />

      {/* ------------------------------------------------ desktop month grid */}
      <div className="hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
        <div className="grid shrink-0 grid-cols-7 border-b border-line">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={cn(
                "flex h-8 items-center justify-end px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
                i > 0 && "border-l border-line/60",
                i >= 5 ? "text-faint/60" : "text-faint"
              )}
            >
              {w}
            </div>
          ))}
        </div>

        <div
          ref={gridRef}
          key={key}
          className="anim-fade grid min-h-[500px] flex-1 grid-cols-7"
          style={{ gridTemplateRows: `repeat(${weeks}, minmax(0, 1fr))` }}
        >
          {days.map((d, i) => (
            <DayCell
              key={d.iso}
              d={d}
              topRow={i < 7}
              units={units}
              now={now}
              isDone={isDone}
              onOpenTask={openTask}
              onMore={openPop}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ mobile month + day */}
      <div className="lg:hidden">
        <div
          className="border-b border-line px-2 pb-1.5 pt-2"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div className="grid grid-cols-7">
            {WEEK_LETTERS.map((l, i) => (
              <span
                key={i}
                aria-hidden
                className={cn(
                  "pb-1 text-center font-mono text-[9px] font-semibold uppercase",
                  i >= 5 ? "text-faint/60" : "text-faint"
                )}
              >
                {l}
              </span>
            ))}
          </div>
          <div key={key} className="anim-fade grid grid-cols-7">
            {days.map((d) => (
              <MiniDay
                key={d.iso}
                d={d}
                selected={d.iso === dayISO}
                now={now}
                isDone={isDone}
                onSelect={() => setDayISO(d.iso)}
              />
            ))}
          </div>
        </div>

        {selectedDay && (
          <section key={dayISO} className="anim-fade">
            <div className="flex h-8 items-center gap-2 border-b border-line/70 bg-[color-mix(in_oklab,var(--surface)_45%,var(--bg))] px-3.5">
              <h3 className="tnum font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                {fmtDateMed(selectedDay.iso)}
              </h3>
              <span className="font-mono text-[10.5px] text-faint">
                {relDay(selectedDay.iso, now)}
              </span>
              {agendaOpen > 0 && (
                <span className="tnum ml-auto font-mono text-[10.5px] text-faint">
                  {agendaOpen} due
                </span>
              )}
            </div>

            {selectedDay.mark && (
              <div
                style={accentStyle(DAY_MARK_HUE[selectedDay.mark.kind])}
                className="a-tint a-border flex items-center gap-2 border-b px-3.5 py-2"
              >
                <span className="a-text font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">
                  {DAY_MARK_SHORT[selectedDay.mark.kind]}
                </span>
                <span className="truncate text-[12px] text-muted">
                  {dayMarkTitle(selectedDay.mark)}
                  {selectedDay.mark.kind === "async" && " · no in-person class"}
                </span>
              </div>
            )}

            {agendaTasks.length === 0 ? (
              <p className="px-3.5 py-8 text-center text-[12px] text-faint">
                {selectedDay.mark?.kind === "no_class"
                  ? "No class — nothing due this day."
                  : "Nothing due this day."}
              </p>
            ) : (
              <ul className="divide-y divide-line/80">
                {agendaTasks.map((t) => (
                  <li key={t.id}>
                    <TaskListRow
                      task={t}
                      now={now}
                      done={isDone(t.id)}
                      selected={t.id === selectedId}
                      onToggleDone={() => toggle(t.id)}
                      onOpen={() => openTask(t.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <DayPopover
        open={popOpen}
        day={pop ? (dayByIso.get(pop.iso) ?? null) : null}
        left={pop?.left ?? 0}
        top={pop?.top ?? 0}
        now={now}
        isDone={isDone}
        onClose={closePop}
        onOpenTask={(id) => {
          closePop();
          openTask(id);
        }}
      />

      <TaskPanel
        task={selected}
        open={selected !== null}
        onClose={() => setSelectedId(null)}
        done={selected ? isDone(selected.id) : false}
        onToggleDone={() => selected && toggle(selected.id)}
        onEdit={(t) => {
          setSelectedId(null);
          router.push(`/tasks?task=${t.id}`);
        }}
        nowISO={nowISO}
      />
    </div>
  );
}

/* ------------------------------------------------------------- day cell */

function DayCell({
  d,
  topRow,
  units,
  now,
  isDone,
  onOpenTask,
  onMore,
}: {
  d: MonthDay;
  topRow: boolean;
  units: number;
  now: Date;
  isDone: (id: number) => boolean;
  onOpenTask: (id: number) => void;
  onMore: (iso: string, e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const ordered = orderDay(d.tasks, isDone);
  const taskUnits = Math.max(0, units - (d.mark ? 1 : 0));
  const visible = ordered.length <= taskUnits ? ordered.length : Math.max(0, taskUnits - 1);
  const hidden = ordered.length - visible;
  const hiddenLate =
    hidden > 0 &&
    ordered
      .slice(visible)
      .some((t) => !isHandled(t, isDone(t.id)) && isPastDue(t.dueDate, t.dueTime, now));

  return (
    <div
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden",
        topRow ? "border-t-0" : "border-t border-line/60",
        d.col > 0 && "border-l border-line/60",
        d.weekend && "bg-shell/45",
        d.isToday && "bg-[color-mix(in_oklab,var(--brand)_6%,transparent)]"
      )}
    >
      {/* day-mark texture — same vocabulary as the week canvas */}
      {d.mark?.kind === "no_class" && (
        <div aria-hidden className="hatch pointer-events-none absolute inset-0" />
      )}
      {d.mark?.kind === "async" && (
        <div
          aria-hidden
          style={accentStyle(DAY_MARK_HUE.async)}
          className="pointer-events-none absolute inset-0 bg-[color-mix(in_oklab,var(--a)_6%,transparent)]"
        />
      )}

      <div className="relative flex h-6 shrink-0 items-center justify-end px-1.5 pt-1">
        {d.isToday ? (
          <span className="tnum grid size-5 place-items-center rounded-full bg-brand font-mono text-[10.5px] font-semibold leading-none text-on-brand">
            {d.dateNum}
          </span>
        ) : (
          <span
            className={cn(
              "tnum font-mono text-[11px] font-medium leading-none",
              !d.inMonth ? "text-faint/60" : d.past ? "text-faint" : "text-muted"
            )}
          >
            {d.dateNum === 1 ? fmtDateShort(d.iso) : d.dateNum}
          </span>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col gap-[2px] px-1 pb-1">
        {d.mark && (
          <div
            style={accentStyle(DAY_MARK_HUE[d.mark.kind])}
            title={`${dayMarkTitle(d.mark)}${d.mark.note ? ` — ${d.mark.note}` : ""}`}
            className="a-text a-tint-2 flex h-[18px] shrink-0 items-center rounded-[4px] px-1.5 font-mono text-[8.5px] font-semibold uppercase tracking-[0.04em]"
          >
            <span className="truncate">
              {d.mark.label?.trim() || DAY_MARK_SHORT[d.mark.kind]}
            </span>
          </div>
        )}

        {ordered.slice(0, visible).map((t) => (
          <TaskChip
            key={t.id}
            t={t}
            now={now}
            handled={isHandled(t, isDone(t.id))}
            dim={!d.inMonth}
            onOpen={() => onOpenTask(t.id)}
          />
        ))}

        {hidden > 0 && (
          <button
            type="button"
            onClick={(e) => onMore(d.iso, e)}
            aria-label={`Show all ${ordered.length} due ${fmtDateLong(d.iso)}`}
            className={cn(
              "tap flex h-[18px] shrink-0 items-center rounded-[3px] px-1 text-left font-mono text-[9.5px] font-medium transition-colors hover:bg-surface-2",
              hiddenLate ? "text-danger-text" : "text-faint hover:text-ink"
            )}
          >
            +{hidden} more
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ task chip */

/**
 * One deadline, one 18px line: type-hue bar · title · unconfirmed dot · time.
 * Open-but-past flips the whole chip to danger; handled work strikes out.
 */
function TaskChip({
  t,
  now,
  handled,
  dim,
  onOpen,
}: {
  t: TaskFull;
  now: Date;
  handled: boolean;
  /** adjacent-month spill — recede without striking */
  dim: boolean;
  onOpen: () => void;
}) {
  const late = !handled && isPastDue(t.dueDate, t.dueTime, now);
  const tip =
    `${t.type.short} · ${t.subject.short}${t.secondarySubject ? `+${t.secondarySubject.short}` : ""} — ${t.title}` +
    (t.dueTime !== null ? ` · ${fmtMinAmPm(t.dueTime)}` : "") +
    (t.status === "cancelled"
      ? " · cancelled"
      : late
        ? " · overdue"
        : t.status === "tentative"
          ? " · unconfirmed"
          : "");

  return (
    <button
      type="button"
      onClick={onOpen}
      title={tip}
      aria-label={tip}
      style={accentStyle(t.type.hue)}
      className={cn(
        "tap flex h-[18px] w-full min-w-0 shrink-0 items-center gap-1.5 rounded-[4px] px-1 text-left transition-colors hover:bg-surface-2",
        handled && "opacity-60",
        dim && "opacity-70"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-[10px] w-[2.5px] shrink-0 rounded-full",
          handled ? "bg-faint" : late ? "bg-danger" : "a-bar"
        )}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[11px] font-medium leading-none",
          handled
            ? "text-faint line-through decoration-1"
            : late
              ? "text-danger-text"
              : "text-ink"
        )}
      >
        {t.title}
      </span>
      {!handled && t.status === "tentative" && (
        <span aria-hidden className="size-1 shrink-0 rounded-full bg-warn" />
      )}
      {t.dueTime !== null && !handled && (
        <span
          className={cn(
            "tnum shrink-0 font-mono text-[9px] leading-none",
            late ? "text-danger-text" : "text-faint"
          )}
        >
          {fmtMin(t.dueTime)}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------- mini day */

/** A mobile grid cell: the date in a state circle over task dots. */
function MiniDay({
  d,
  selected,
  now,
  isDone,
  onSelect,
}: {
  d: MonthDay;
  selected: boolean;
  now: Date;
  isDone: (id: number) => boolean;
  onSelect: () => void;
}) {
  if (!d.inMonth) {
    return (
      <span
        aria-hidden
        className="tnum flex h-12 items-start justify-center pt-[7px] font-mono text-[12px] font-medium text-faint/40"
      >
        {d.dateNum}
      </span>
    );
  }

  const openCount = d.tasks.filter((t) => !isHandled(t, isDone(t.id))).length;
  const dots = d.tasks.slice(0, 3);
  const extra = d.tasks.length - dots.length;
  const label =
    `${fmtDateLong(d.iso)}` +
    (openCount > 0 ? `, ${openCount} due` : "") +
    (d.mark ? `, ${DAY_MARK_SHORT[d.mark.kind]}` : "");

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      aria-current={d.isToday ? "date" : undefined}
      className="tap flex h-12 flex-col items-center gap-1 pt-1"
    >
      <span
        className={cn(
          "tnum grid size-6 place-items-center rounded-full font-mono text-[12px] font-medium leading-none transition-colors duration-[var(--dur-1)]",
          d.isToday
            ? "bg-brand font-semibold text-on-brand"
            : selected
              ? "bg-[color-mix(in_oklab,var(--brand)_16%,var(--bg))] font-semibold text-brand-text"
              : d.past
                ? "text-faint"
                : "text-muted"
        )}
      >
        {d.dateNum}
      </span>
      <span className="flex h-1.5 items-center gap-[3px]">
        {d.mark && (
          <span
            style={accentStyle(DAY_MARK_HUE[d.mark.kind])}
            className="a-bar h-[3px] w-3 rounded-full"
            aria-hidden
          />
        )}
        {dots.map((t) => {
          const handled = isHandled(t, isDone(t.id));
          const late = !handled && isPastDue(t.dueDate, t.dueTime, now);
          return (
            <span
              key={t.id}
              aria-hidden
              style={accentStyle(t.type.hue)}
              className={cn(
                "size-[4px] rounded-full",
                handled ? "bg-faint/60" : late ? "bg-danger" : "a-dot"
              )}
            />
          );
        })}
        {extra > 0 && (
          <span aria-hidden className="font-mono text-[8px] leading-none text-faint">
            +{extra}
          </span>
        )}
      </span>
    </button>
  );
}

/* ----------------------------------------------------------- day popover */

/**
 * The overflow peek for a crowded day — anchored to its "+n more", every
 * deadline in full, one tap from the task panel. Menu-grade surface.
 */
function DayPopover({
  open,
  day,
  left,
  top,
  now,
  isDone,
  onClose,
  onOpenTask,
}: {
  open: boolean;
  day: MonthDay | null;
  left: number;
  top: number;
  now: Date;
  isDone: (id: number) => boolean;
  onClose: () => void;
  onOpenTask: (id: number) => void;
}) {
  const { mounted, state } = usePresence(open);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    ref.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onResize = () => onClose();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("resize", onResize);
    };
  }, [open, onClose]);

  if (!mounted || !day) return null;

  const ordered = orderDay(day.tasks, isDone);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Due ${fmtDateLong(day.iso)}`}
      tabIndex={-1}
      data-state={state}
      style={{ left, top }}
      className="anim-pop fixed z-30 flex w-[304px] flex-col overflow-hidden rounded-[var(--r-panel)] border border-line bg-pop shadow-[var(--shadow-pop)] outline-none"
    >
      <div className="flex items-baseline gap-2 border-b border-line px-3 py-2">
        <span className="text-[12.5px] font-semibold text-ink">{fmtDateLong(day.iso)}</span>
        <span className="tnum ml-auto font-mono text-[10.5px] text-faint">
          {ordered.length} due
        </span>
      </div>

      <div className="max-h-[336px] overflow-y-auto p-1.5">
        {day.mark && (
          <div
            style={accentStyle(DAY_MARK_HUE[day.mark.kind])}
            className="a-tint a-border mb-1 rounded-[6px] border px-2 py-1.5"
          >
            <span className="a-text font-mono text-[9.5px] font-semibold uppercase tracking-[0.05em]">
              {DAY_MARK_SHORT[day.mark.kind]}
            </span>
            <p className="clamp-2 mt-0.5 text-[11.5px] leading-snug text-muted">
              {dayMarkTitle(day.mark)}
              {day.mark.note ? ` — ${day.mark.note}` : ""}
            </p>
          </div>
        )}

        {ordered.length === 0 ? (
          <p className="px-2 py-4 text-center text-[11.5px] text-faint">Nothing due.</p>
        ) : (
          ordered.map((t) => {
            const handled = isHandled(t, isDone(t.id));
            const late = !handled && isPastDue(t.dueDate, t.dueTime, now);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onOpenTask(t.id)}
                className="tap flex h-8 w-full items-center gap-2 rounded-[6px] px-1.5 text-left transition-colors hover:bg-surface-2"
              >
                <HueBadge hue={t.type.hue} className="w-11 justify-center">
                  {t.type.short}
                </HueBadge>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[12px] font-medium",
                    handled ? "text-faint line-through decoration-1" : "text-ink"
                  )}
                >
                  {t.title}
                </span>
                {!handled && t.status === "tentative" && (
                  <span
                    aria-label="Unconfirmed"
                    className="size-1.5 shrink-0 rounded-full bg-warn"
                  />
                )}
                <span style={accentStyle(t.subject.hue)} className="flex shrink-0 items-center gap-1">
                  <span className="a-dot size-1.5 rounded-full" aria-hidden />
                  <span className="font-mono text-[10px] font-medium text-muted">
                    {t.subject.short}
                  </span>
                </span>
                <span
                  className={cn(
                    "tnum w-[46px] shrink-0 text-right font-mono text-[10px]",
                    late ? "font-semibold text-danger-text" : "text-faint"
                  )}
                >
                  {t.status === "cancelled"
                    ? "—"
                    : late
                      ? "overdue"
                      : t.dueTime !== null
                        ? fmtMin(t.dueTime)
                        : ""}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
