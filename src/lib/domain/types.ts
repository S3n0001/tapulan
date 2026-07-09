/**
 * Row shapes shared by the SQLite data layer and the UI.
 * Nothing here hardcodes actual schedule/task content — that lives in the
 * database (seeded once from `db/seed.ts`, then owned by admins).
 */

export type StrandCode = "STEM" | "ABM" | "HUMSS";

export interface Strand {
  code: StrandCode;
  name: string;
  tagline: string;
  hue: string;
}

export interface Teacher {
  id: number;
  name: string;
  note: string | null;
}

export interface Subject {
  id: number;
  name: string;
  short: string;
  teacherId: number | null;
  /** null = core subject taken by every strand */
  strand: StrandCode | null;
  hue: string;
  room: string | null;
}

export interface SubjectFull extends Subject {
  teacher: Teacher | null;
}

/** class = a subject meets · break = recess/lunch · fixture = assembly, cleaning, SYG… */
export type PeriodKind = "class" | "break" | "fixture";

export interface Period {
  id: number;
  /** 1 = Monday … 5 = Friday */
  day: number;
  /** minutes from midnight */
  start: number;
  end: number;
  kind: PeriodKind;
  label: string | null;
  subjectId: number | null;
  /** teacher override for this meeting only (else the subject's teacher) */
  teacherId: number | null;
  /** null = all strands attend */
  strand: StrandCode | null;
}

export interface PeriodFull extends Period {
  subject: SubjectFull | null;
  /** resolved: override ?? subject teacher */
  teacher: Teacher | null;
}

/** async = no physical class · no_class = holiday/suspension, nothing scheduled */
export type DayMarkKind = "async" | "no_class";

/**
 * A calendar override on one specific date. Where a `Period` recurs weekly,
 * a `DayMark` names a single date (e.g. "this Wednesday is Async") and takes
 * over that day's schedule rendering.
 */
export interface DayMark {
  /** YYYY-MM-DD (local) — one mark per date */
  date: string;
  kind: DayMarkKind;
  /** optional title override; else the kind's default name */
  label: string | null;
  /** optional clarification shown with the day */
  note: string | null;
}

export interface TaskType {
  id: number;
  name: string;
  short: string;
  hue: string;
  sort: number;
}

/** A repeating requirement's pattern; its occurrences are individual tasks. */
export interface TaskSeries {
  id: number;
  title: string;
  freq: "daily" | "weekly" | "monthly";
  /** every N weeks/months */
  interval: number;
  /** weekly: which school days, 1 = Mon … 5 = Fri */
  weekdays: number[];
  /** monthly: 1..5 = nth weekday, -1 = last */
  nth: number | null;
  /** monthly: which weekday, 1 = Mon … 5 = Fri */
  weekday: number | null;
  startDate: string;
  endDate: string | null;
  count: number | null;
  createdAt: string;
}

export type TaskStatus = "confirmed" | "tentative" | "done" | "cancelled";

export const TASK_STATUSES: TaskStatus[] = [
  "confirmed",
  "tentative",
  "done",
  "cancelled",
];

export interface Task {
  id: number;
  title: string;
  details: string;
  subjectId: number;
  /** optional collab class — a second subject this task also belongs to */
  secondarySubjectId: number | null;
  /** the repeating series this occurrence belongs to, if any */
  seriesId: number | null;
  typeId: number;
  /** YYYY-MM-DD (local) */
  dueDate: string;
  /** minutes from midnight, null = end of day */
  dueTime: number | null;
  status: TaskStatus;
  /** section-wide "finished during class" marker, admin-set (not personal) */
  doneInClass: boolean;
  /**
   * Sat *during* the class meeting (a UT, quiz, oral, performance task) rather
   * than submitted by a deadline — so "end of day" is the wrong time. The
   * actual moment is resolved from the schedule (see `TaskFull.classMeeting`).
   * Distinct from `doneInClass`, which is the retrospective "already finished".
   */
  heldInClass: boolean;
  /** original YYYY-MM-DD when the date was moved */
  movedFrom: string | null;
  /** why it was called off — shown only when status is "cancelled" (optional) */
  cancelReason: string | null;
  /** clarification shown with the task ("waiting for teacher's go signal…") */
  note: string | null;
  points: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Material attached to a task: an external link or an uploaded file. */
export interface TaskLink {
  id: number;
  taskId: number;
  label: string;
  url: string;
  kind: "link" | "file";
  sort: number;
}

/** The class period a held-in-class task sits in, resolved from the schedule. */
export interface ClassMeeting {
  /** minutes from midnight */
  start: number;
  end: number;
  /** which of the task's subjects meets then (its class or its collab) */
  subjectId: number;
}

export interface TaskFull extends Task {
  subject: SubjectFull;
  /** resolved collab class, when `secondarySubjectId` is set */
  secondarySubject: SubjectFull | null;
  type: TaskType;
  links: TaskLink[];
  /**
   * For a held-in-class task, the meeting on its due date its subject meets —
   * the honest time it happens. null when `heldInClass` is false, or when the
   * subject doesn't meet that weekday (a movable test; UI shows a plain tag).
   */
  classMeeting: ClassMeeting | null;
}

/** Every subject a task belongs to (its class, plus a collab if any). */
export function taskSubjectIds(t: {
  subjectId: number;
  secondarySubjectId: number | null;
}): number[] {
  return t.secondarySubjectId !== null && t.secondarySubjectId !== t.subjectId
    ? [t.subjectId, t.secondarySubjectId]
    : [t.subjectId];
}

export interface Settings {
  sectionName: string;
  schoolYear: string;
}

/**
 * A personal/individual calendar an admin curates — a work roster, a person's
 * timetable, a duty rota. Its blocks are recurring weekly time slots. Distinct
 * from the section's class `periods`; gated to everyone by `published`.
 */
export interface Calendar {
  id: number;
  name: string;
  /** optional secondary line — whose calendar it is, or what it covers */
  subtitle: string | null;
  hue: string;
  /** visible to everyone in Settings when true; an admin-only draft otherwise */
  published: boolean;
  sort: number;
  createdAt: string;
}

/** One recurring weekly block on a calendar. */
export interface CalendarBlock {
  id: number;
  calendarId: number;
  /** 0 = Sunday … 6 = Saturday (weekends allowed, unlike class periods) */
  day: number;
  /** minutes from midnight */
  start: number;
  end: number;
  label: string;
  note: string | null;
}

export interface CalendarFull extends Calendar {
  /** the calendar's blocks, ordered Monday-first then by start time */
  blocks: CalendarBlock[];
}
