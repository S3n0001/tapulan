"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Inbox } from "lucide-react";
import type { PeriodFull, TaskFull } from "@/lib/domain/types";
import { liveForDay, periodProgress } from "@/lib/domain/schedule";
import {
  DAY_NAMES,
  dueLabel,
  dueTone,
  fmtDuration,
  fmtMin,
  fmtMinAmPm,
  minutesOf,
  type DueTone,
} from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { useNow } from "@/hooks/use-now";
import { useDone } from "@/hooks/use-done";
import { cn } from "@/lib/utils";
import { Toolbar } from "@/components/shell/toolbar";
import { HueBadge, WarnFlag } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { DoneCheck } from "@/components/tasks/done-check";

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
  soon,
  nowISO,
  showStrand,
}: {
  dayPeriods: PeriodFull[];
  /** 1–5, the school day being shown */
  day: number;
  isToday: boolean;
  /** the calendar date that `day` refers to */
  dateISO: string;
  soon: TaskFull[];
  nowISO: string;
  /** no strand picked — label the strand-split rows */
  showStrand: boolean;
}) {
  const now = useNow(nowISO, 30_000);
  const nowMin = minutesOf(now);
  const live = liveForDay(dayPeriods, nowMin, isToday);
  const shownDate = new Date(dateISO);

  return (
    <div className="anim-view">
      <Toolbar
        title="Today"
        meta={
          <>
            <span>{DATE_FMT.format(shownDate)}</span>
            {isToday && (
              <>
                <span className="text-line-strong">·</span>
                <span>{CLOCK_FMT.format(now)}</span>
              </>
            )}
          </>
        }
      />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_336px]">
        <section className="min-w-0 lg:border-r lg:border-line">
          {!isToday && (
            <p className="flex items-center gap-2 border-b border-line bg-surface/50 px-3.5 py-2 text-[12.5px] text-muted lg:px-4">
              <CalendarDays className="size-3.5 shrink-0 text-faint" />
              Weekend — this is {DAY_NAMES[day]}&apos;s schedule.
            </p>
          )}

          <div className="p-3.5 lg:p-4">
            <NowStrip periods={dayPeriods} live={live} nowMin={nowMin} isToday={isToday} />
          </div>

          <DayTimeline
            periods={dayPeriods}
            live={live}
            nowMin={nowMin}
            isToday={isToday}
            showStrand={showStrand}
          />
        </section>

        <aside className="border-t border-line lg:border-t-0">
          <h2 className="flex h-9 items-center gap-2 border-b border-line/70 px-3.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint lg:px-4">
            Due soon
            <span className="tnum">{soon.length}</span>
            <span className="ml-auto font-normal normal-case tracking-normal">next 7 days</span>
          </h2>
          <DueSoonList tasks={soon} now={now} />
        </aside>
      </div>
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
  const next = periods.find((p) => p.id === live.nextId) ?? null;

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
          <span className="live-dot size-1.5 rounded-full bg-ok" aria-hidden />
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
}: {
  periods: PeriodFull[];
  live: ReturnType<typeof liveForDay>;
  nowMin: number;
  isToday: boolean;
  showStrand: boolean;
}) {
  if (periods.length === 0) {
    return (
      <EmptyState icon={CalendarDays} title="No periods on this day">
        Your schedule will show up here once it&apos;s set.
      </EmptyState>
    );
  }

  return (
    <div className="pb-4">
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
          return (
            <Link
              key={p.id}
              href={`/classes?c=${p.subject.id}`}
              style={accentStyle(hue)}
              className={rowClass}
            >
              {rowContent}
            </Link>
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

function DueSoonList({ tasks, now }: { tasks: TaskFull[]; now: Date }) {
  const router = useRouter();
  const { isDone, toggle } = useDone();

  const visible = tasks.filter((t) => t.status !== "done" && !isDone(t.id));

  if (visible.length === 0) {
    return (
      <EmptyState icon={Inbox} title="Nothing due this week" className="py-10">
        The next seven days are clear. Check Tasks for what&apos;s further out.
      </EmptyState>
    );
  }

  return (
    <ul className="divide-y divide-line/60">
      {visible.map((t) => {
        const tone = dueTone(t.dueDate, now);
        return (
          <li key={t.id} className="flex items-center gap-2.5 px-3.5 py-2 transition-colors hover:bg-surface/70 lg:px-4">
            <DoneCheck done={isDone(t.id)} onToggle={() => toggle(t.id)} className="size-4 rounded-[4px]" />
            <button
              type="button"
              onClick={() => router.push(`/tasks?task=${t.id}`)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <HueBadge hue={t.type.hue} className="w-10 justify-center">
                {t.type.short}
              </HueBadge>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[12.5px] font-medium leading-snug text-ink">
                    {t.title}
                  </span>
                  {(t.movedFrom || t.status === "tentative") && (
                    <WarnFlag>{t.movedFrom ? "moved" : "unconfirmed"}</WarnFlag>
                  )}
                </span>
                <span
                  style={accentStyle(t.subject.hue)}
                  className="mt-0.5 flex items-center gap-1 font-mono text-[10.5px] text-faint"
                >
                  <span className="a-dot size-1 rounded-full" />
                  {t.subject.short}
                </span>
              </span>
              <span
                className={cn(
                  "tnum shrink-0 font-mono text-[11.5px] font-medium",
                  TONE_TEXT[tone]
                )}
              >
                {dueLabel(t.dueDate, now)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
