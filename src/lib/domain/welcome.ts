import type { DayMark, DayMarkKind, PeriodFull, TaskFull } from "./types";
import { periodsForDay, resolveScheduleDay } from "./schedule";
import { dueMinOf, isActionable, sortMinOf } from "./tasks";
import { isPastDue, toISODate } from "./time";
import { dayMarkTitle } from "./day-mark";

/**
 * The single honest "as of today" fact the landing prints in its colophon — a
 * stamped ledger reading of the section's *real* present state, never a vanity
 * metric. Pure and I/O-free (the mark is fetched by the caller and passed in),
 * so the honesty logic stays testable and out of the view.
 *
 * `now` chooses the school day exactly the way the Today view does: today on a
 * weekday, else the coming Monday — so the line previews what the app will show.
 */
export interface SectionStatus {
  /** the school day being described, YYYY-MM-DD */
  dateISO: string;
  /** false on weekends, when `dateISO` is the coming Monday rather than today */
  isSchoolToday: boolean;
  /** an async / no-class override on that date, if any */
  mark: { kind: DayMarkKind; title: string } | null;
  /** first class meeting of the day (minutes from midnight); null on a marked day or an empty schedule */
  firstClassMin: number | null;
  /** still-actionable requirements, overdue + upcoming */
  openCount: number;
  /** the subset already past their deadline */
  overdueCount: number;
  /** the soonest still-open, not-yet-overdue requirement */
  nearest: { title: string; dueDate: string } | null;
  /** the section has a schedule set */
  hasSchedule: boolean;
  /** anything at all is posted — distinguishes a fresh section from a quiet one */
  hasAnyData: boolean;
}

export function sectionStatus(
  periods: PeriodFull[],
  mark: DayMark | null,
  tasks: TaskFull[],
  now: Date
): SectionStatus {
  const { day, isToday, date } = resolveScheduleDay(now);
  const dateISO = toISODate(date);

  // first *class* of the day (assemblies, breaks and cleaning don't count); a
  // marked day (async / no class) has no in-person first class to name.
  const firstClassMin = mark
    ? null
    : (periodsForDay(periods, day).find((p) => p.kind === "class")?.start ?? null);

  const actionable = tasks.filter(isActionable);
  const overdueCount = actionable.filter((t) => isPastDue(t.dueDate, dueMinOf(t), now)).length;

  const upcoming = actionable
    .filter((t) => !isPastDue(t.dueDate, dueMinOf(t), now))
    .sort((a, b) =>
      a.dueDate !== b.dueDate ? (a.dueDate < b.dueDate ? -1 : 1) : sortMinOf(a) - sortMinOf(b)
    );
  const nearest = upcoming[0]
    ? { title: upcoming[0].title, dueDate: upcoming[0].dueDate }
    : null;

  return {
    dateISO,
    isSchoolToday: isToday,
    mark: mark ? { kind: mark.kind, title: dayMarkTitle(mark) } : null,
    firstClassMin,
    openCount: actionable.length,
    overdueCount,
    nearest,
    hasSchedule: periods.length > 0,
    hasAnyData: periods.length > 0 || tasks.length > 0,
  };
}
