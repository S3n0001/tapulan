/**
 * Time & date helpers. Periods store minutes-from-midnight; tasks store
 * local YYYY-MM-DD dates. Everything renders in the device's timezone —
 * the whole section lives in one.
 */

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** School days as JS weekday numbers (Mon–Fri). */
export const SCHOOL_DAYS = [1, 2, 3, 4, 5] as const;

// ---------------------------------------------------------------- minutes

export function minutesOf(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** "7:45" — bare 12-hour clock, the way the printed schedule writes it. */
export function fmtMin(min: number): string {
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")}`;
}

/** "7:45 AM" */
export function fmtMinAmPm(min: number): string {
  const h24 = Math.floor(min / 60);
  return `${fmtMin(min)} ${h24 < 12 ? "AM" : "PM"}`;
}

/** "1h 30m" / "45m" */
export function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** minutes → "HH:MM" for <input type="time"> */
export function minToInput(min: number | null): string {
  if (min === null) return "";
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** "HH:MM" from <input type="time"> → minutes (null when empty) */
export function inputToMin(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// ------------------------------------------------------------------ dates

/** Local date as YYYY-MM-DD. */
export function toISODate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isISODate(value: string): boolean {
  // round-trip so calendar-impossible dates (Feb 31, month 13) that Date
  // would silently normalize to another day are rejected
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toISODate(fromISODate(value)) === value;
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Whole days from `from`'s date to `iso`'s date (negative = past). */
export function daysUntil(iso: string, from: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((fromISODate(iso).getTime() - a.getTime()) / 86_400_000);
}

/** Monday of the week containing `d` (Sat/Sun roll forward to next week). */
export function schoolWeekMonday(d: Date): Date {
  const day = d.getDay();
  if (day === 0) return addDays(d, 1); // Sunday → tomorrow
  if (day === 6) return addDays(d, 2); // Saturday → Monday
  return addDays(d, 1 - day);
}

// ----------------------------------------------------------------- months

/** First day of the month containing `d`. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** First day of the month `n` months away from `d`'s month. */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/** "2026-07" — the month key used by the calendar's `?m=` param. */
export function monthKeyOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Validate a `?m=` value into a month key, or null when malformed. */
export function parseMonthKey(value: string | undefined): string | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return null;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? value : null;
}

const FMT_MONTH = new Intl.DateTimeFormat("en-PH", { month: "long", year: "numeric" });

/** "July 2026" */
export function fmtMonthYear(d: Date): string {
  return FMT_MONTH.format(d);
}

const FMT_LONG = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const FMT_MED = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  month: "short",
  day: "numeric",
});
const FMT_SHORT = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" });

export function fmtDateLong(iso: string): string {
  return FMT_LONG.format(fromISODate(iso));
}
export function fmtDateMed(iso: string): string {
  return FMT_MED.format(fromISODate(iso));
}
export function fmtDateShort(iso: string): string {
  return FMT_SHORT.format(fromISODate(iso));
}

/**
 * True once the deadline has passed. A `dueTime` (minutes from midnight)
 * makes a same-day deadline expire at that minute; null = end of day.
 */
export function isPastDue(iso: string, dueTime: number | null, from: Date): boolean {
  const days = daysUntil(iso, from);
  if (days < 0) return true;
  if (days === 0 && dueTime !== null) return minutesOf(from) >= dueTime;
  return false;
}

/** Compact due label: "3d overdue" · "Overdue" · "Today" · "Tomorrow" · "Thu · Jul 16" */
export function dueLabel(iso: string, from: Date, dueTime: number | null = null): string {
  const days = daysUntil(iso, from);
  if (days < 0) return days === -1 ? "1d overdue" : `${-days}d overdue`;
  if (days === 0) return isPastDue(iso, dueTime, from) ? "Overdue" : "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 6) return fmtDateMed(iso);
  return fmtDateShort(iso);
}

export type DueTone = "danger" | "warn" | "soon" | "normal";

export function dueTone(iso: string, from: Date, dueTime: number | null = null): DueTone {
  const days = daysUntil(iso, from);
  if (days < 0) return "danger";
  if (days === 0) return isPastDue(iso, dueTime, from) ? "danger" : "warn";
  if (days <= 2) return "soon";
  return "normal";
}
