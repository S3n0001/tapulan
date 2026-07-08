import { taskSubjectIds, type ClassMeeting, type PeriodFull } from "./types";
import { fromISODate } from "./time";
import { isoWeekday } from "./recurrence";

/**
 * Pure scheduling logic shared by the Today and Week views. No I/O, no
 * server bindings — safe on both sides of the wire.
 */

export type PeriodState = "past" | "current" | "upcoming";

/**
 * The class meeting a held-in-class task sits in: the period on the task's due
 * date where one of its subjects (its class, or its collab) meets. The earliest
 * match wins; returns null when the subject doesn't meet that weekday — a
 * movable test, where the UI falls back to a plain "In class" with no clock.
 * Pure, so the editor can preview it live and the read layer can bake it in.
 */
export function classMeetingFor(
  task: { subjectId: number; secondarySubjectId: number | null; dueDate: string },
  periods: PeriodFull[]
): ClassMeeting | null {
  const wd = isoWeekday(fromISODate(task.dueDate));
  if (wd < 1 || wd > 5) return null;
  const ids = taskSubjectIds(task);
  let best: PeriodFull | null = null;
  for (const p of periods) {
    if (p.kind !== "class" || p.day !== wd || p.subjectId === null) continue;
    if (!ids.includes(p.subjectId)) continue;
    if (!best || p.start < best.start) best = p;
  }
  return best ? { start: best.start, end: best.end, subjectId: best.subjectId! } : null;
}

export interface ResolvedDay {
  /** 1 = Monday … 5 = Friday */
  day: number;
  /** true when `day` is the actual weekday right now */
  isToday: boolean;
  /** the calendar date `day` refers to */
  date: Date;
}

/** Which school day to show now: today on weekdays, else the coming Monday. */
export function resolveScheduleDay(now: Date): ResolvedDay {
  const js = now.getDay();
  if (js >= 1 && js <= 5) return { day: js, isToday: true, date: now };
  const add = js === 6 ? 2 : 1; // Sat → Mon (+2), Sun → Mon (+1)
  const date = new Date(now);
  date.setDate(date.getDate() + add);
  return { day: 1, isToday: false, date };
}

export function periodsForDay(periods: PeriodFull[], day: number): PeriodFull[] {
  return periods.filter((p) => p.day === day);
}

export interface DayLive {
  states: Map<number, PeriodState>;
  currentId: number | null;
  /** the meeting happening or next up (any kind) */
  nextId: number | null;
  /** the next actual class (skips breaks & fixtures) */
  nextClassId: number | null;
}

/** Classify a single day's periods against the current minute-of-day. */
export function liveForDay(
  dayPeriods: PeriodFull[],
  nowMin: number,
  isToday: boolean
): DayLive {
  const states = new Map<number, PeriodState>();
  let currentId: number | null = null;
  let nextId: number | null = null;
  let nextClassId: number | null = null;

  for (const p of dayPeriods) {
    if (!isToday) {
      states.set(p.id, "upcoming");
      continue;
    }
    if (nowMin >= p.end) {
      states.set(p.id, "past");
    } else if (nowMin >= p.start && nowMin < p.end) {
      states.set(p.id, "current");
      currentId = p.id;
    } else {
      states.set(p.id, "upcoming");
    }
  }

  if (isToday) {
    for (const p of dayPeriods) {
      if (p.start > nowMin) {
        if (nextId === null) nextId = p.id;
        if (nextClassId === null && p.kind === "class") nextClassId = p.id;
      }
    }
  } else if (dayPeriods.length) {
    nextId = dayPeriods[0].id;
    nextClassId = dayPeriods.find((p) => p.kind === "class")?.id ?? null;
  }

  return { states, currentId, nextId, nextClassId };
}

/** Fraction 0–1 of how far `nowMin` is through a period (for progress bars). */
export function periodProgress(period: PeriodFull, nowMin: number): number {
  const span = period.end - period.start;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (nowMin - period.start) / span));
}
