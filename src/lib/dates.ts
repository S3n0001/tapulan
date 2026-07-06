import type { Task } from "./types";

export function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Whole days between today and the task's due date (negative = past). */
export function daysUntil(dueAt: string, now: Date = new Date()): number {
  const due = startOfDay(new Date(dueAt)).getTime();
  const today = startOfDay(now).getTime();
  return Math.round((due - today) / 86_400_000);
}

export function isOverdue(task: Task, now: Date = new Date()): boolean {
  return new Date(task.dueAt).getTime() < now.getTime();
}

export type DueBucket =
  | "overdue"
  | "today"
  | "tomorrow"
  | "week"
  | "later";

export const BUCKET_LABELS: Record<DueBucket, string> = {
  overdue: "Overdue",
  today: "Today",
  tomorrow: "Tomorrow",
  week: "This week",
  later: "Later",
};

export const BUCKET_ORDER: DueBucket[] = [
  "overdue",
  "today",
  "tomorrow",
  "week",
  "later",
];

export function bucketOf(task: Task, now: Date = new Date()): DueBucket {
  const days = daysUntil(task.dueAt, now);
  if (days < 0 || (days === 0 && isOverdue(task, now))) return days < 0 ? "overdue" : "today";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days <= 7) return "week";
  return "later";
}

const DATE_FMT = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
});

const DATE_FMT_FULL = new Intl.DateTimeFormat("en-PH", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const TIME_FMT = new Intl.DateTimeFormat("en-PH", {
  hour: "numeric",
  minute: "2-digit",
});

const WEEKDAY_FMT = new Intl.DateTimeFormat("en-PH", { weekday: "short" });

export function formatDueShort(dueAt: string): string {
  return DATE_FMT.format(new Date(dueAt));
}

export function formatDueLong(dueAt: string): string {
  const d = new Date(dueAt);
  return `${DATE_FMT_FULL.format(d)} · ${TIME_FMT.format(d)}`;
}

/** Compact human label for list rows: "3d overdue", "Today 9:00 AM", "Wed · Jul 15". */
export function dueLabel(task: Task, now: Date = new Date()): string {
  const days = daysUntil(task.dueAt, now);
  const d = new Date(task.dueAt);
  if (days < 0) return days === -1 ? "1 day overdue" : `${-days} days overdue`;
  if (days === 0) return `Today · ${TIME_FMT.format(d)}`;
  if (days === 1) return `Tomorrow · ${TIME_FMT.format(d)}`;
  if (days <= 7) return `${WEEKDAY_FMT.format(d)} · ${DATE_FMT.format(d)}`;
  return DATE_FMT.format(d);
}

export type DueTone = "danger" | "warn" | "soon" | "normal";

export function dueTone(task: Task, now: Date = new Date()): DueTone {
  const days = daysUntil(task.dueAt, now);
  if (days < 0 || isOverdue(task, now)) return "danger";
  if (days === 0) return "warn";
  if (days <= 3) return "soon";
  return "normal";
}

/** For <input type="datetime-local"> values (local time, minute precision). */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
