/**
 * Recurring-task rules. A compact weekly / monthly / school-day pattern that
 * expands to a concrete list of due dates. The app *materializes* every
 * occurrence as its own task row — so Today / Week / Calendar and per-occurrence
 * move / cancel / done all keep working unchanged. This module is the pure
 * generator, safe to run on the server (create) and the client (live preview).
 */
import {
  addDays,
  addMonths,
  DAY_SHORT,
  fromISODate,
  isISODate,
  startOfMonth,
  toISODate,
} from "./time";

export type RecurFreq = "daily" | "weekly" | "monthly";

export const RECUR_FREQS: RecurFreq[] = ["daily", "weekly", "monthly"];

export interface RecurrenceRule {
  freq: RecurFreq;
  /** every N weeks (weekly) or N months (monthly); ignored for daily. >= 1 */
  interval: number;
  /** weekly: which school days repeat, 1 = Mon … 5 = Fri (deduped, sorted) */
  weekdays: number[];
  /** monthly: 1..5 = the nth weekday, -1 = the last; null otherwise */
  nth: number | null;
  /** monthly: which weekday, 1 = Mon … 5 = Fri; null otherwise */
  weekday: number | null;
  /** first date the series may emit (inclusive), YYYY-MM-DD */
  startDate: string;
  /** last date it may emit (inclusive), or null when bounded by count */
  endDate: string | null;
  /** number of occurrences, or null when bounded by endDate */
  count: number | null;
}

/** The most occurrences one series may ever generate — a runaway guard. */
export const MAX_OCCURRENCES = 200;

/** Ordinals an admin can pick for a monthly rule. */
export const MONTHLY_ORDINALS: { value: number; label: string }[] = [
  { value: 1, label: "First" },
  { value: 2, label: "Second" },
  { value: 3, label: "Third" },
  { value: 4, label: "Fourth" },
  { value: 5, label: "Fifth" },
  { value: -1, label: "Last" },
];

/** Mon = 1 … Sun = 7 for a Date (JS getDay is Sun = 0). */
export function isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

/** "Mon" … "Fri" for an ISO weekday (1 = Mon). */
export function weekdayShort(iso: number): string {
  // DAY_SHORT is Sun-first; iso 1..7 → index 1..0
  return DAY_SHORT[iso % 7];
}

/** Monday of the week containing `d`. */
function mondayOf(d: Date): Date {
  return addDays(d, -(isoWeekday(d) - 1));
}

/**
 * The date of the `nth` `weekday` in the month of `monthStart`. `nth` 1..5
 * counts from the start; `nth` -1 is the last such weekday. Returns null when
 * a 5th occurrence doesn't exist in that month.
 */
function nthWeekdayOfMonth(monthStart: Date, weekday: number, nth: number): Date | null {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  if (nth === -1) {
    const last = new Date(year, month + 1, 0);
    const shift = (isoWeekday(last) - weekday + 7) % 7;
    return addDays(last, -shift);
  }
  const first = new Date(year, month, 1);
  const shift = (weekday - isoWeekday(first) + 7) % 7;
  const date = new Date(year, month, 1 + shift + (nth - 1) * 7);
  return date.getMonth() === month ? date : null;
}

/**
 * Validate a raw rule, returning a clean rule or a user-facing message.
 * Exactly one of `endDate` / `count` bounds the series; `count` wins if both
 * arrive. `count` is clamped to MAX_OCCURRENCES.
 */
export function normalizeRule(rule: RecurrenceRule): RecurrenceRule | string {
  if (!RECUR_FREQS.includes(rule.freq)) return "Pick how the task repeats.";
  if (!isISODate(rule.startDate)) return "The repeat needs a valid start date.";
  const interval = Number.isInteger(rule.interval) && rule.interval >= 1 ? rule.interval : 1;

  let weekdays: number[] = [];
  let nth: number | null = null;
  let weekday: number | null = null;

  if (rule.freq === "weekly") {
    weekdays = Array.from(new Set(rule.weekdays))
      .filter((d) => d >= 1 && d <= 5)
      .sort((a, b) => a - b);
    if (weekdays.length === 0) return "Pick at least one weekday to repeat on.";
  } else if (rule.freq === "monthly") {
    if (!(Number.isInteger(rule.nth) && (rule.nth === -1 || (rule.nth! >= 1 && rule.nth! <= 5))))
      return "Pick which week of the month (1st–5th or last).";
    if (!(Number.isInteger(rule.weekday) && rule.weekday! >= 1 && rule.weekday! <= 5))
      return "Pick which weekday of the month.";
    nth = rule.nth;
    weekday = rule.weekday;
  }

  let endDate: string | null = null;
  let count: number | null = null;
  if (rule.count !== null && Number.isInteger(rule.count)) {
    if (rule.count < 1) return "The repeat count has to be at least 1.";
    count = Math.min(rule.count, MAX_OCCURRENCES);
  } else if (rule.endDate !== null) {
    if (!isISODate(rule.endDate)) return "The repeat end date looks off.";
    if (rule.endDate < rule.startDate) return "The repeat ends before it starts.";
    endDate = rule.endDate;
  } else {
    return "Set an end date or a number of times to repeat.";
  }

  return {
    freq: rule.freq,
    interval,
    weekdays,
    nth,
    weekday,
    startDate: rule.startDate,
    endDate,
    count,
  };
}

/**
 * Expand a (normalized) rule into concrete due dates, ascending. Always
 * bounded — by `count`, by `endDate`, and by a hard MAX_OCCURRENCES backstop
 * so a misconfigured rule can never flood the table.
 */
export function expandRule(rule: RecurrenceRule): string[] {
  const dates: string[] = [];
  const start = fromISODate(rule.startDate);
  const end = rule.endDate ? fromISODate(rule.endDate) : null;
  const limit = Math.min(rule.count ?? MAX_OCCURRENCES, MAX_OCCURRENCES);

  // emit `d`; returns false when the caller should stop (horizon or limit hit)
  const push = (d: Date): boolean => {
    if (d < start) return true; // before the window — skip but keep going
    if (end && d > end) return false; // past the horizon — done
    dates.push(toISODate(d));
    return dates.length < limit;
  };

  if (rule.freq === "daily") {
    let d = start;
    for (let i = 0; i < 800 && dates.length < limit; i++) {
      const wd = isoWeekday(d);
      if (wd >= 1 && wd <= 5 && !push(d)) break;
      d = addDays(d, 1);
    }
  } else if (rule.freq === "weekly") {
    let weekStart = mondayOf(start);
    for (let w = 0; w < 260; w++) {
      let stop = false;
      for (const wd of rule.weekdays) {
        if (!push(addDays(weekStart, wd - 1))) {
          stop = true;
          break;
        }
      }
      if (stop || dates.length >= limit) break;
      weekStart = addDays(weekStart, 7 * rule.interval);
      if (end && weekStart > end) break;
    }
  } else {
    let m = startOfMonth(start);
    for (let i = 0; i < 240; i++) {
      const d = nthWeekdayOfMonth(m, rule.weekday!, rule.nth!);
      if (d && !push(d)) break;
      m = addMonths(m, rule.interval);
      if (end && m > end) break;
    }
  }

  return dates;
}

/** A one-line, human summary of a rule: "Every Monday", "First Fri monthly". */
export function describeRule(rule: {
  freq: RecurFreq;
  interval: number;
  weekdays: number[];
  nth: number | null;
  weekday: number | null;
}): string {
  if (rule.freq === "daily") return "Every school day";
  if (rule.freq === "weekly") {
    const days = [...rule.weekdays].sort((a, b) => a - b).map(weekdayShort).join(", ") || "—";
    const every = rule.interval > 1 ? `Every ${rule.interval} weeks on ` : "Every ";
    return `${every}${days}`;
  }
  const ord = MONTHLY_ORDINALS.find((o) => o.value === rule.nth)?.label ?? "";
  const day = rule.weekday ? weekdayShort(rule.weekday) : "—";
  const every = rule.interval > 1 ? `every ${rule.interval} months` : "monthly";
  return `${ord} ${day} ${every}`;
}
