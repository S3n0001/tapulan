import type { TaskFull } from "./types";
import { daysUntil } from "./time";

/** Grouping + filtering for task lists. Pure; shared client/server. */

export type Bucket = "overdue" | "today" | "tomorrow" | "week" | "later";

export const BUCKET_LABEL: Record<Bucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  week: "This week",
  later: "Later",
};

export const BUCKET_ORDER: Bucket[] = ["overdue", "today", "tomorrow", "week", "later"];

export function bucketOf(dueDate: string, now: Date): Bucket {
  const d = daysUntil(dueDate, now);
  if (d < 0) return "overdue";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d <= 7) return "week";
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
    const b = bucketOf(t.dueDate, now);
    (map.get(b) ?? map.set(b, []).get(b)!).push(t);
  }
  return BUCKET_ORDER.filter((b) => map.has(b)).map((bucket) => ({
    bucket,
    label: BUCKET_LABEL[bucket],
    tasks: map.get(bucket)!,
  }));
}

/** Upcoming, still-actionable tasks within `days` (drops cancelled). */
export function dueSoon(tasks: TaskFull[], now: Date, days = 7): TaskFull[] {
  return tasks.filter((t) => {
    if (t.status === "cancelled") return false;
    const d = daysUntil(t.dueDate, now);
    return d <= days;
  });
}
