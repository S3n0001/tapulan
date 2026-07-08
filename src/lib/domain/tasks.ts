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
    const b = bucketOf(t.dueDate, now, dueMinOf(t));
    (map.get(b) ?? map.set(b, []).get(b)!).push(t);
  }
  return BUCKET_ORDER.filter((b) => map.has(b)).map((bucket) => ({
    bucket,
    label: BUCKET_LABEL[bucket],
    tasks: map.get(bucket)!,
  }));
}

/** Still-actionable — not done for the section (incl. in class) and not cancelled. */
export function isActionable(t: TaskFull): boolean {
  return t.status !== "cancelled" && t.status !== "done" && !t.doneInClass;
}

/** A task's timing, held-in-class aware — enough of a task to resolve it. */
type Timed = Pick<TaskFull, "heldInClass" | "dueTime" | "classMeeting">;

/**
 * The clock minute a held-in-class task actually happens — an explicit time
 * overrides, else the class meeting's start. null for a normal task (it has a
 * deadline, not a start), or a held task whose class doesn't meet that day.
 */
export function classTimeOf(t: Timed): number | null {
  if (!t.heldInClass) return null;
  return t.dueTime ?? t.classMeeting?.start ?? null;
}

/**
 * The minute a task's deadline expires, for overdue/bucket math. A normal task
 * uses its due time (null = end of day); a held-in-class one expires when its
 * meeting ends — so a UT isn't "overdue" from midnight — unless a time is set.
 */
export function dueMinOf(t: Timed): number | null {
  if (t.heldInClass) return t.dueTime ?? t.classMeeting?.end ?? null;
  return t.dueTime;
}

/**
 * The clock minute to sort a task by within its due date: a held-in-class
 * task sorts by when it actually happens (classTimeOf); everything else by
 * its due time, with untimed tasks last. Used to order the day agenda,
 * calendar cells, and the Today "due soon" rail consistently.
 */
export function sortMinOf(t: Timed): number {
  return classTimeOf(t) ?? dueMinOf(t) ?? Infinity;
}

/**
 * Upcoming, still-actionable tasks due within [today, +days] — excludes
 * anything already overdue (see `overdue`) so a "due soon" count is honest.
 */
export function dueSoon(tasks: TaskFull[], now: Date, days = 7): TaskFull[] {
  return tasks.filter((t) => {
    if (!isActionable(t)) return false;
    if (isPastDue(t.dueDate, dueMinOf(t), now)) return false;
    return daysUntil(t.dueDate, now) <= days;
  });
}

/** Still-actionable tasks whose deadline has already passed. */
export function overdue(tasks: TaskFull[], now: Date): TaskFull[] {
  return tasks.filter((t) => isActionable(t) && isPastDue(t.dueDate, dueMinOf(t), now));
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
