import type { TaskFull } from "./types";
import { daysUntil, isPastDue } from "./time";

/** Grouping + filtering for task lists. Pure; shared client/server. */

export type Bucket =
  | "overdue"
  | "today"
  | "tomorrow"
  | "week"
  | "nextWeek"
  | "month"
  | "later";

export const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  week: "This week",
  nextWeek: "Next week",
  month: "This month",
  later: "Later",
};

export const BUCKET_ORDER: Bucket[] = [
  "overdue",
  "today",
  "tomorrow",
  "week",
  "nextWeek",
  "month",
  "later",
];

/**
 * Which due bucket a task falls in. `dueTime` (minutes from midnight) lets a
 * deadline that already passed *today* count as overdue rather than "today".
 */
export function bucketOf(dueDate: string, now: Date, dueTime: number | null = null): Bucket {
  const d = daysUntil(dueDate, now);
  if (d < 0) return "overdue";
  if (d === 0) return isPastDue(dueDate, dueTime, now) ? "overdue" : "today";
  if (d === 1) return "tomorrow";
  if (d <= 7) return "week";
  if (d <= 14) return "nextWeek";
  if (d <= 30) return "month";
  return "later";
}

export interface TaskGroup {
  bucket: Bucket;
  label: string;
  tasks: TaskFull[];
}

/** Group tasks into due buckets, preserving the incoming due-sorted order. */
export function groupByBucket(tasks: TaskFull[], now: Date): TaskGroup[] {
  const map = new Map<Bucket, TaskFull[]>();
  for (const t of tasks) {
    const b = bucketOf(t.dueDate, now, t.dueTime);
    (map.get(b) ?? map.set(b, []).get(b)!).push(t);
  }
  return BUCKET_ORDER.filter((b) => map.has(b)).map((bucket) => ({
    bucket,
    label: BUCKET_LABEL[bucket],
    tasks: map.get(bucket)!,
  }));
}

/** Still-actionable — not done for the section and not cancelled. */
export function isActionable(t: TaskFull): boolean {
  return t.status !== "cancelled" && t.status !== "done";
}

/**
 * Upcoming, still-actionable tasks due within [today, +days] — excludes
 * anything already overdue (see `overdue`) so a "due soon" count is honest.
 */
export function dueSoon(tasks: TaskFull[], now: Date, days = 7): TaskFull[] {
  return tasks.filter((t) => {
    if (!isActionable(t)) return false;
    if (isPastDue(t.dueDate, t.dueTime, now)) return false;
    return daysUntil(t.dueDate, now) <= days;
  });
}

/** Still-actionable tasks whose deadline has already passed. */
export function overdue(tasks: TaskFull[], now: Date): TaskFull[] {
  return tasks.filter((t) => isActionable(t) && isPastDue(t.dueDate, t.dueTime, now));
}

/** Tasks whose due date falls in [fromISO, toISO] inclusive (ISO strings sort lexically). */
export function dueBetween(tasks: TaskFull[], fromISO: string, toISO: string): TaskFull[] {
  return tasks.filter((t) => t.dueDate >= fromISO && t.dueDate <= toISO);
}

export interface DateGroup {
  /** YYYY-MM-DD */
  date: string;
  tasks: TaskFull[];
}

/** Group tasks by exact due date, ascending — the calendar agenda's rows. */
export function groupByDate(tasks: TaskFull[]): DateGroup[] {
  const map = new Map<string, TaskFull[]>();
  for (const t of tasks) {
    (map.get(t.dueDate) ?? map.set(t.dueDate, []).get(t.dueDate)!).push(t);
  }
  return [...map.keys()]
    .sort()
    .map((date) => ({ date, tasks: map.get(date)! }));
}
