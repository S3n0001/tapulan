"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CalendarOff,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Inbox,
  Laptop,
} from "lucide-react";
import { taskSubjectIds, type DayMark, type PeriodFull, type TaskFull } from "@/lib/domain/types";
import { liveForDay, periodProgress } from "@/lib/domain/schedule";
import {
  DAY_MARK_ASYNC_POINTS,
  DAY_MARK_BLURB,
  DAY_MARK_HUE,
  DAY_MARK_SHORT,
  dayMarkTitle,
} from "@/lib/domain/day-mark";
import { dueMinOf, isActionable } from "@/lib/domain/tasks";
import {
  DAY_NAMES,
  daysUntil,
  dueLabel,
  dueTone,
  fmtDateMed,
  fmtDuration,
  fmtMin,
  fmtMinAmPm,
  fromISODate,
  isPastDue,
  minutesOf,
  toISODate,
  type DueTone,
} from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { useNow } from "@/hooks/use-now";
import { useDone } from "@/hooks/use-done";
import { usePrefs } from "@/hooks/use-prefs";
import { cn } from "@/lib/utils";
import { ViewChrome } from "@/components/shell/view-chrome";
import { HueBadge, InfoFlag, WarnFlag } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { DoneCheck } from "@/components/tasks/done-check";
import { DueFlag } from "@/components/tasks/due-flag";
import { useClassDetail } from "@/components/classes/class-detail";

const DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const CLOCK_FMT = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
});

export function TodayView({
  dayPeriods,
  day,
  isToday,
  dateISO,
  mark,
  tasks,
  nowISO,
  showStrand,
}: {
  dayPeriods: PeriodFull[];
  /** 1–5, the school day being shown */
  day: number;
  isToday: boolean;
  /** the calendar date that `day` refers to */
  dateISO: string;
  /** async / no-class override for this date, if any */
  mark: DayMark | null;
  /** the whole strand-scoped task list — the rail buckets it client-side */
  tasks: TaskFull[];
  nowISO: string;
  /** no strand picked — label the strand-split rows */
  showStrand: boolean;
}) {
  const now = useNow(nowISO, 30_000);
  const nowMin = minutesOf(now);
  // an async / no-class day has nothing "live" — neutralize the timeline state
  const liveActive = isToday && mark === null;
  const live = liveForDay(dayPeriods, nowMin, liveActive);
  const shownDate = fromISODate(dateISO);

  // announce the now-strip to screen readers only when the *period* changes,
  // not on every 30s countdown tick — gated on the current/next period id
  // rather than on `now` itself
  const currents = dayPeriods.filter((p) => live.states.get(p.id) === "current");
  const nowStripAnnounceKey = currents[0]?.id ?? live.nextClassId ?? "none";
  const nowStripAnnounceText = currents.length > 0
    ? currents.length > 1
      ? "Strand split block"
      : (currents[0].subject?.name ?? currents[0].label ?? "Current period")
    : (() => {
        const next = dayPeriods.find((p) => p.id === live.nextClassId) ?? null;
        return next ? `Up next: ${next.subject?.name ?? next.label ?? ""}` : "No more periods today";
      })();

  // requirements due on the shown day, grouped by subject — so each class row
  // can flag the peta/quiz that belongs to it, right on the timeline
  const shownISO = toISODate(shownDate);
  const dueBySubject = useMemo(() => {
    const map = new Map<number, TaskFull[]>();
    for (const t of tasks) {
      if (!isActionable(t) || t.dueDate !== shownISO) continue;
      // a collab requirement flags on both of its class blocks
      for (const id of taskSubjectIds(t)) {
        (map.get(id) ?? map.set(id, []).get(id)!).push(t);
      }
    }
    return map;
  }, [tasks, shownISO]);

  return (
    <ViewChrome
      title="Today"
      icon={Clock3}
      flat
      meta={
        <>
          <span className="tnum">{DATE_FMT.format(shownDate)}</span>
          {isToday && (
            <>
              <span className="text-line-strong">·</span>
              <time className="tnum" dateTime={now.toISOString()}>
                {CLOCK_FMT.format(now)}
              </time>
            </>
          )}
        </>
      }
    >

      {/* two self-contained cards on the shell void — the 8px gap matches the
          shell's own panel margin, so the void reads through evenly. flex-1
          stretches both to equal height, so a light day still rests on a full
          card rather than a stub. Mobile stacks them in the edge-to-edge panel
          (a card would be bg-on-bg there), split only by the aside's hairline. */}
      <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_336px] lg:gap-2">
        <section className="flex min-w-0 flex-col overflow-hidden lg:rounded-[var(--r-panel)] lg:border lg:border-line lg:bg-bg">
          {!isToday && (
            <p className="flex items-center gap-2 border-b border-line bg-surface/50 px-3.5 py-2 text-[12.5px] text-muted lg:px-4">
              <CalendarDays className="size-3.5 shrink-0 text-faint" />
              Weekend — this is {DAY_NAMES[day]}&apos;s schedule.
            </p>
          )}

          <div className="p-3.5 lg:p-4" role="status" aria-live="polite">
            {/* visually-hidden announcement, keyed on period identity so it
                only changes (and is only announced) on a period transition —
                not on every countdown tick from the visible card below */}
            {isToday && !mark && (
              <span key={nowStripAnnounceKey} className="sr-only">
                {nowStripAnnounceText}
              </span>
            )}
            {mark ? (
              <DayMarkHero mark={mark} day={day} isToday={isToday} />
            ) : (
              <NowStrip periods={dayPeriods} live={live} nowMin={nowMin} isToday={isToday} />
            )}
          </div>

          {/* no-class blanks the day; async keeps the subjects as a study list */}
          {mark?.kind !== "no_class" && (
            <DayTimeline
              periods={dayPeriods}
              live={live}
              nowMin={nowMin}
              isToday={liveActive}
              showStrand={showStrand}
              asyncDay={mark?.kind === "async"}
              dueBySubject={dueBySubject}
            />
          )}
          {/* fill the tail so a short timeline rests on a considered surface —
              desktop only; on mobile the due rail stacks right below */}
          <div aria-hidden className="canvas-floor hidden min-h-16 flex-1 lg:block" />
        </section>

        <aside className="flex flex-1 flex-col overflow-hidden border-t border-line lg:rounded-[var(--r-panel)] lg:border lg:border-line lg:bg-bg">
          <DueRail tasks={tasks} now={now} />
          <div aria-hidden className="canvas-floor min-h-16 flex-1" />
        </aside>
      </div>
    </ViewChrome>
  );
}

/* --------------------------------------------------------- day-mark hero */

/**
 * Replaces the now-strip on an async / no-class day: one calm card stating
 * what the day is, since nothing is "live" to count down.
 */
function DayMarkHero({
  mark,
  day,
  isToday,
}: {
  mark: DayMark;
  day: number;
  isToday: boolean;
}) {
  const Icon = mark.kind === "async" ? Laptop : CalendarOff;
  return (
    <div
      style={accentStyle(DAY_MARK_HUE[mark.kind])}
      className="a-tint a-border rounded-[var(--r-card)] border px-3.5 py-3"
    >
      <div className="flex items-center gap-2">
        <Icon className="a-text size-4 shrink-0" strokeWidth={1.75} />
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
          {isToday ? "Today" : DAY_NAMES[day]}
        </span>
        <span className="a-text a-tint-2 ml-auto rounded-[4px] px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-[0.04em]">
          {DAY_MARK_SHORT[mark.kind]}
        </span>
      </div>
      <p className="mt-1.5 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
        {dayMarkTitle(mark)}
      </p>
      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">
        {mark.note?.trim() || DAY_MARK_BLURB[mark.kind]}
      </p>
      {mark.kind === "async" && (
        <ul className="mt-3 space-y-1.5 border-t border-line/60 pt-2.5">
          {DAY_MARK_ASYNC_POINTS.map((point) => (
            <li
              key={point.label}
              className="flex items-start gap-2 text-[12px] leading-snug text-muted"
            >
              <span className="a-dot mt-[5px] size-1 shrink-0 rounded-full" aria-hidden />
              <span>
                <span className="font-medium text-ink">{point.label}</span> — {point.text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- now strip */

function NowStrip({
  periods,
  live,
  nowMin,
  isToday,
}: {
  periods: PeriodFull[];
  live: ReturnType<typeof liveForDay>;
  nowMin: number;
  isToday: boolean;
}) {
  // a strand-split block means several classes share the current slot
  const currents = periods.filter((p) => live.states.get(p.id) === "current");
  const current = currents[0] ?? null;
  // the next *class* — skip breaks/fixtures so "Next" never announces Recess
  const next = periods.find((p) => p.id === live.nextClassId) ?? null;

  if (!isToday) {
    return next ? <UpNextCard period={next} label="First period" isToday={false} nowMin={nowMin} /> : null;
  }

  if (current) {
    const split = currents.length > 1;
    const hue = split ? "slate" : (current.subject?.hue ?? "slate");
    const title = split
      ? "Strand split block"
      : (current.subject?.name ?? current.label ?? "—");
    const remaining = current.end - nowMin;
    const pct = Math.round(periodProgress(current, nowMin) * 100);

    return (
      <div
        style={accentStyle(hue)}
        className="a-tint a-border rounded-[var(--r-card)] border px-3.5 py-3"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
            Now
          </span>
          {!split && current.subject && (
            <span className="a-text font-mono text-[11px] font-semibold">
              {current.subject.short}
            </span>
          )}
          <span className="tnum ml-auto font-mono text-[12px] font-medium text-ink">
            {fmtDuration(remaining)} left
          </span>
        </div>
        <p className="mt-1.5 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          {title}
        </p>
        {split ? (
          <ul className="mt-1.5 space-y-1">
            {currents.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-[12px]">
                {p.subject && (
                  <span
                    style={accentStyle(p.subject.hue)}
                    className="a-dot size-1.5 shrink-0 rounded-full"
                  />
                )}
                {p.strand && (
                  <span className="w-11 shrink-0 font-mono text-[10px] font-semibold text-faint">
                    {p.strand}
                  </span>
                )}
                <span className="truncate font-medium text-ink">
                  {p.subject?.name ?? p.label}
                </span>
                {p.teacher && (
                  <span className="truncate text-muted">· {p.teacher.name}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="tnum mt-0.5 font-mono text-[11.5px] text-muted">
            {fmtMin(current.start)}–{fmtMin(current.end)}
            {current.teacher && <span className="font-sans"> · {current.teacher.name}</span>}
            {current.subject?.room && <span className="font-sans"> · {current.subject.room}</span>}
          </p>
        )}
        <div
          className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--a)_18%,var(--line))]"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${title} progress`}
        >
          <div
            className="a-bar h-full rounded-full transition-[width] duration-500 ease-[var(--ease-standard)] will-change-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
        {next && (
          <div className="mt-2.5 flex items-center gap-2 border-t border-line/60 pt-2 text-[12px]">
            <span className="text-faint">Next</span>
            <span className="truncate font-medium text-ink">
              {next.subject?.name ?? next.label}
            </span>
            <span className="tnum ml-auto shrink-0 font-mono text-muted">
              {fmtMin(next.start)} · in {fmtDuration(next.start - nowMin)}
            </span>
          </div>
        )}
      </div>
    );
  }

  if (next) {
    return <UpNextCard period={next} label="Up next" isToday nowMin={nowMin} />;
  }

  return (
    <div className="flex items-center gap-3 rounded-[var(--r-card)] border border-line bg-surface px-3.5 py-3">
      <CheckCircle2 className="size-4.5 shrink-0 text-ok" />
      <div>
        <p className="text-[13.5px] font-medium text-ink">That&apos;s it for today</p>
        <p className="text-[12px] text-muted">
          No more periods — check what&apos;s due before tomorrow.
        </p>
      </div>
    </div>
  );
}

function UpNextCard({
  period,
  label,
  isToday,
  nowMin,
}: {
  period: PeriodFull;
  label: string;
  isToday: boolean;
  nowMin: number;
}) {
  return (
    <div className="rounded-[var(--r-card)] border border-line bg-surface px-3.5 py-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">
          {label}
        </span>
        {period.subject && (
          <span
            style={accentStyle(period.subject.hue)}
            className="a-text font-mono text-[11px] font-semibold"
          >
            {period.subject.short}
          </span>
        )}
        <span className="tnum ml-auto font-mono text-[12px] text-muted">
          {fmtMinAmPm(period.start)}
          {isToday && ` · in ${fmtDuration(period.start - nowMin)}`}
        </span>
      </div>
      <p className="mt-1 text-[14.5px] font-semibold leading-snug tracking-[-0.01em] text-ink">
        {period.subject?.name ?? period.label}
      </p>
      {(period.teacher || period.subject?.room) && (
        <p className="mt-0.5 text-[12px] text-muted">
          {[period.teacher?.name, period.subject?.room].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- timeline */

function DayTimeline({
  periods,
  live,
  nowMin,
  isToday,
  showStrand,
  asyncDay = false,
  dueBySubject,
}: {
  periods: PeriodFull[];
  live: ReturnType<typeof liveForDay>;
  nowMin: number;
  isToday: boolean;
  showStrand: boolean;
  /** async day — subjects are shown for self-study, nothing is live */
  asyncDay?: boolean;
  /** requirements due today, keyed by subject id */
  dueBySubject: Map<number, TaskFull[]>;
}) {
  const { openClass } = useClassDetail();

  if (periods.length === 0) {
    return (
      <EmptyState icon={CalendarDays} title="No periods on this day">
        Your schedule will show up here once it&apos;s set.
      </EmptyState>
    );
  }

  return (
    <div className="pb-4">
      {asyncDay && (
        <p className="flex items-center gap-1.5 px-3.5 pb-1.5 lg:px-4">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-faint">
            Subjects today
          </span>
          <span className="text-[11.5px] text-faint">· asynchronous, no in-person meeting</span>
        </p>
      )}
      {periods.map((p) => {
        const state = live.states.get(p.id) ?? "upcoming";
        const isCurrent = state === "current";

        if (p.kind !== "class") {
          return (
            <div
              key={p.id}
              className={cn(
                "flex h-8 items-center gap-3 px-3.5 lg:px-4",
                state === "past" && "opacity-50"
              )}
            >
              <span className="tnum w-[46px] shrink-0 text-right font-mono text-[10.5px] text-faint">
                {fmtMin(p.start)}
              </span>
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.06em] text-faint">
                {p.label}
              </span>
              <span className="h-px flex-1 border-t border-dotted border-line-strong/70" aria-hidden />
              <span className="tnum font-mono text-[10.5px] text-faint">
                {fmtDuration(p.end - p.start)}
              </span>
            </div>
          );
        }

        const hue = p.subject?.hue ?? "slate";
        const rowClass = cn(
          "flex min-h-[50px] items-center gap-3 px-3.5 py-1.5 transition-colors duration-[var(--dur-1)] lg:px-4",
          state === "past" && "opacity-55",
          isCurrent && "a-tint a-ring",
          "hover:bg-surface/60 focus-visible:bg-surface-2 focus-visible:outline-none"
        );
        const rowContent = (
          <>
            <span className="w-[46px] shrink-0 text-right">
              <span
                className={cn(
                  "tnum block font-mono text-[12px] font-medium leading-tight",
                  isCurrent ? "text-ink" : "text-muted"
                )}
              >
                {fmtMin(p.start)}
              </span>
              <span className="tnum block font-mono text-[10.5px] leading-tight text-faint">
                {fmtMin(p.end)}
              </span>
            </span>

            <span className="a-dot size-2 shrink-0 rounded-full" aria-hidden />

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[13.5px] font-medium leading-snug text-ink">
                  {p.subject?.name ?? p.label}
                </span>
                {showStrand && p.strand && (
                  <span className="shrink-0 rounded-[4px] bg-surface-2 px-1 font-mono text-[10px] font-semibold text-muted">
                    {p.strand}
                  </span>
                )}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
                {p.subject && (
                  <span className="a-text font-mono text-[10.5px] font-semibold">
                    {p.subject.short}
                  </span>
                )}
                {p.teacher && <span className="truncate">{p.teacher.name}</span>}
                {p.subject?.room && (
                  <>
                    <span className="text-line-strong">·</span>
                    <span>{p.subject.room}</span>
                  </>
                )}
              </span>
            </span>

            {p.subject && <DueFlag tasks={dueBySubject.get(p.subject.id) ?? []} className="shrink-0" />}

            {isCurrent ? (
              <span className="a-text tnum shrink-0 font-mono text-[11.5px] font-semibold">
                {fmtDuration(p.end - nowMin)} left
              </span>
            ) : (
              <span className="tnum shrink-0 font-mono text-[11px] text-faint">
                {fmtDuration(p.end - p.start)}
              </span>
            )}
          </>
        );

        if (p.subject) {
          const subjectId = p.subject.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => openClass(subjectId)}
              style={accentStyle(hue)}
              className={cn(rowClass, "w-full cursor-pointer text-left")}
            >
              {rowContent}
            </button>
          );
        }

        return (
          <div key={p.id} style={accentStyle(hue)} className={rowClass}>
            {rowContent}
          </div>
        );
      })}
      {!isToday && null}
    </div>
  );
}

/* ------------------------------------------------------------- due soon */

const TONE_TEXT: Record<DueTone, string> = {
  danger: "text-danger-text",
  warn: "text-warn-text",
  soon: "text-ink",
  normal: "text-muted",
};

type Horizon = 7 | 14 | 30;
const HORIZONS: Horizon[] = [7, 14, 30];

/**
 * The "due soon" rail. Splits the full task list into overdue / within the
 * chosen horizon / further out — so a deadline next week is a visible count
 * with a link to the calendar, never silently dropped past a 7-day window.
 */
function DueRail({ tasks, now }: { tasks: TaskFull[]; now: Date }) {
  const router = useRouter();
  const { isDone, toggle } = useDone();
  // the due-soon window is a device preference, so it sticks between visits
  // (and stays in sync with the Settings page) instead of resetting to 7d
  const { prefs, setPref } = usePrefs();
  const horizon = prefs.horizon;

  // personal "done" is device-local; drop it alongside section done/cancelled
  const active = tasks.filter((t) => isActionable(t) && !isDone(t.id));
  const od = active.filter((t) => isPastDue(t.dueDate, dueMinOf(t), now));
  const upcoming = active.filter((t) => !isPastDue(t.dueDate, dueMinOf(t), now));
  const within = upcoming.filter((t) => daysUntil(t.dueDate, now) <= horizon);
  const later = upcoming.filter((t) => daysUntil(t.dueDate, now) > horizon);
  const nearest = upcoming[0] ?? null; // list is due-sorted → first is soonest

  const open = (id: number) => router.push(`/tasks?task=${id}`);

  return (
    <>
      <div className="flex h-9 items-center gap-2 border-b border-line/70 px-3.5 lg:px-4">
        <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">
          Due soon
        </h2>
        <div className="ml-auto flex items-center gap-0.5" role="group" aria-label="Due horizon">
          {HORIZONS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setPref("horizon", h)}
              aria-pressed={horizon === h}
              className={cn(
                "tnum tap rounded-[var(--r-chip)] px-1.5 py-0.5 font-mono text-[10.5px] font-medium transition-colors duration-[var(--dur-1)]",
                horizon === h
                  ? "bg-[color-mix(in_oklab,var(--brand)_16%,var(--bg))] text-brand-text"
                  : "text-faint hover:text-muted"
              )}
            >
              {h}d
            </button>
          ))}
        </div>
      </div>

      {od.length === 0 && within.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={nearest ? "Nothing due soon" : "All clear"}
          className="py-10"
        >
          {nearest ? (
            <>
              Next up is <span className="font-medium text-ink">{nearest.title}</span> ·{" "}
              <span className="tnum font-mono">{fmtDateMed(nearest.dueDate)}</span>.{" "}
              <Link href="/calendar" className="text-brand-text hover:underline">
                Open the calendar
              </Link>
              .
            </>
          ) : (
            <>New requirements show up here the moment an admin posts them.</>
          )}
        </EmptyState>
      ) : (
        <>
          {od.length > 0 && (
            <DueGroup label="Overdue" count={od.length} danger>
              <ul className="divide-y divide-line/60">
                {od.map((t) => (
                  <DueRow
                    key={t.id}
                    task={t}
                    now={now}
                    done={isDone(t.id)}
                    onToggle={() => toggle(t.id)}
                    onOpen={() => open(t.id)}
                  />
                ))}
              </ul>
            </DueGroup>
          )}

          <DueGroup label={`Next ${horizon} days`} count={within.length}>
            {within.length > 0 ? (
              <ul className="divide-y divide-line/60">
                {within.map((t) => (
                  <DueRow
                    key={t.id}
                    task={t}
                    now={now}
                    done={isDone(t.id)}
                    onToggle={() => toggle(t.id)}
                    onOpen={() => open(t.id)}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-3.5 py-3 text-[12px] text-faint lg:px-4">
                Clear for the next {horizon} days.
              </p>
            )}
          </DueGroup>

          {later.length > 0 && (
            <Link
              href="/calendar"
              className="flex items-center gap-2 border-t border-line/70 px-3.5 py-2.5 text-[12px] text-muted transition-colors hover:bg-surface/60 hover:text-ink lg:px-4"
            >
              <CalendarRange className="size-3.5 text-faint" />
              <span>
                <span className="tnum font-mono font-medium text-ink">{later.length}</span> due later
              </span>
              <ArrowRight className="ml-auto size-3.5 text-faint" />
            </Link>
          )}
        </>
      )}
    </>
  );
}

function DueGroup({
  label,
  count,
  danger = false,
  children,
}: {
  label: string;
  count: number;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex h-7 items-center gap-2 border-b border-line/60 bg-surface/30 px-3.5 lg:px-4">
        <h3
          className={cn(
            "font-mono text-[10px] font-semibold uppercase tracking-[0.06em]",
            danger ? "text-danger-text" : "text-muted"
          )}
        >
          {label}
        </h3>
        <span className="tnum font-mono text-[10px] text-faint">{count}</span>
      </div>
      {children}
    </section>
  );
}

function DueRow({
  task,
  now,
  done,
  onToggle,
  onOpen,
}: {
  task: TaskFull;
  now: Date;
  done: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const tone = dueTone(task.dueDate, now, dueMinOf(task));
  return (
    <li className="flex items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-surface/70 lg:px-4">
      <DoneCheck done={done} onToggle={onToggle} className="size-4 rounded-[4px]" />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <HueBadge hue={task.type.hue} className="w-10 justify-center">
          {task.type.short}
        </HueBadge>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-medium leading-snug text-ink">
              {task.title}
            </span>
            {task.heldInClass && <InfoFlag>In class</InfoFlag>}
            {(task.movedFrom || task.status === "tentative") && (
              <WarnFlag>{task.movedFrom ? "Moved" : "Unconfirmed"}</WarnFlag>
            )}
          </span>
          <span
            style={accentStyle(task.subject.hue)}
            className="mt-0.5 flex items-center gap-1 font-mono text-[10.5px] text-faint"
          >
            <span className="a-dot size-1 rounded-full" />
            {task.subject.short}
          </span>
        </span>
        <span
          className={cn("tnum shrink-0 font-mono text-[11.5px] font-medium", TONE_TEXT[tone])}
        >
          {dueLabel(task.dueDate, now, task.dueTime)}
        </span>
      </button>
    </li>
  );
}
