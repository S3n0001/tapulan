import "server-only";
import { cache } from "react";
import { getDb, getMeta } from "@/lib/db";
import { classMeetingFor } from "@/lib/domain/schedule";
import { sortMinOf } from "@/lib/domain/tasks";
import { monFirstIndex } from "@/lib/domain/calendar";
import type {
  Calendar,
  CalendarBlock,
  CalendarFull,
  DayMark,
  DayMarkKind,
  Period,
  PeriodFull,
  Settings,
  Strand,
  StrandCode,
  Subject,
  SubjectFull,
  Task,
  TaskFull,
  TaskLink,
  TaskSeries,
  TaskType,
  Teacher,
} from "@/lib/domain/types";

/** Read-side queries. All snake_case ↔ camelCase mapping happens here. */

// ------------------------------------------------------------------ rows

interface TeacherRow {
  id: number;
  name: string;
  note: string | null;
}

interface SubjectRow {
  id: number;
  name: string;
  short: string;
  teacher_id: number | null;
  strand: StrandCode | null;
  hue: string;
  room: string | null;
}

interface PeriodRow {
  id: number;
  day: number;
  start_min: number;
  end_min: number;
  kind: Period["kind"];
  label: string | null;
  subject_id: number | null;
  teacher_id: number | null;
  strand: StrandCode | null;
}

interface DayMarkRow {
  date: string;
  kind: DayMarkKind;
  label: string | null;
  note: string | null;
}

interface TaskRow {
  id: number;
  title: string;
  details: string;
  subject_id: number;
  secondary_subject_id: number | null;
  series_id: number | null;
  type_id: number;
  due_date: string;
  due_time: number | null;
  status: Task["status"];
  done_in_class: number;
  held_in_class: number;
  moved_from: string | null;
  cancel_reason: string | null;
  note: string | null;
  points: number | null;
  created_at: string;
  updated_at: string;
}

interface TaskLinkRow {
  id: number;
  task_id: number;
  label: string;
  url: string;
  kind: TaskLink["kind"];
  sort: number;
}

function mapLink(row: TaskLinkRow): TaskLink {
  return {
    id: row.id,
    taskId: row.task_id,
    label: row.label,
    url: row.url,
    kind: row.kind,
    sort: row.sort,
  };
}

function mapTeacher(row: TeacherRow): Teacher {
  return { id: row.id, name: row.name, note: row.note };
}

function mapSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
    short: row.short,
    teacherId: row.teacher_id,
    strand: row.strand,
    hue: row.hue,
    room: row.room,
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    details: row.details,
    subjectId: row.subject_id,
    secondarySubjectId: row.secondary_subject_id,
    seriesId: row.series_id,
    typeId: row.type_id,
    dueDate: row.due_date,
    dueTime: row.due_time,
    status: row.status,
    doneInClass: !!row.done_in_class,
    heldInClass: !!row.held_in_class,
    movedFrom: row.moved_from,
    cancelReason: row.cancel_reason,
    note: row.note,
    points: row.points,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// --------------------------------------------------------------- queries

export function getStrands(): Strand[] {
  return getDb()
    .prepare("SELECT code, name, tagline, hue FROM strands ORDER BY code")
    .all() as Strand[];
}

export function getSettings(): Settings {
  return {
    sectionName: getMeta("section_name") ?? "",
    schoolYear: getMeta("school_year") ?? "",
  };
}

export const getTeachers = cache((): Teacher[] => {
  return (getDb().prepare("SELECT * FROM teachers ORDER BY name").all() as TeacherRow[]).map(
    mapTeacher
  );
});

/** Subjects with teacher resolved. `strand` filters to core + that strand. */
export const getSubjects = cache((strand?: StrandCode | null): SubjectFull[] => {
  const db = getDb();
  const rows = (
    strand
      ? db
          .prepare(
            "SELECT * FROM subjects WHERE strand IS NULL OR strand = ? ORDER BY strand IS NOT NULL, name"
          )
          .all(strand)
      : db.prepare("SELECT * FROM subjects ORDER BY strand IS NOT NULL, strand, name").all()
  ) as SubjectRow[];

  const teachers = new Map(getTeachers().map((t) => [t.id, t]));
  return rows.map((row) => ({
    ...mapSubject(row),
    teacher: row.teacher_id !== null ? (teachers.get(row.teacher_id) ?? null) : null,
  }));
});

/**
 * The week's periods with subject + teacher resolved, ordered by day and
 * start time. With a strand: that strand's view (core rows + its splits).
 * Without: every row (admin).
 */
export const getPeriods = cache((strand?: StrandCode | null): PeriodFull[] => {
  const db = getDb();
  const rows = (
    strand
      ? db
          .prepare(
            "SELECT * FROM periods WHERE strand IS NULL OR strand = ? ORDER BY day, start_min, strand IS NULL"
          )
          .all(strand)
      : db.prepare("SELECT * FROM periods ORDER BY day, start_min, strand").all()
  ) as PeriodRow[];

  const subjects = new Map(getSubjects().map((s) => [s.id, s]));
  const teachers = new Map(getTeachers().map((t) => [t.id, t]));

  return rows.map((row) => {
    const subject = row.subject_id !== null ? (subjects.get(row.subject_id) ?? null) : null;
    const override = row.teacher_id !== null ? (teachers.get(row.teacher_id) ?? null) : null;
    return {
      id: row.id,
      day: row.day,
      start: row.start_min,
      end: row.end_min,
      kind: row.kind,
      label: row.label,
      subjectId: row.subject_id,
      teacherId: row.teacher_id,
      strand: row.strand,
      subject,
      teacher: override ?? subject?.teacher ?? null,
    };
  });
});

// ------------------------------------------------------------- day marks

/** All calendar overrides, soonest first. For the admin calendar list. */
export function getDayMarks(): DayMark[] {
  return getDb()
    .prepare("SELECT date, kind, label, note FROM day_marks ORDER BY date")
    .all() as DayMarkRow[];
}

/** The override for a single date, or null. For the Today view. */
export function getDayMark(iso: string): DayMark | null {
  const row = getDb()
    .prepare("SELECT date, kind, label, note FROM day_marks WHERE date = ?")
    .get(iso) as DayMarkRow | undefined;
  return row ?? null;
}

/** Overrides in [fromISO, toISO], keyed by date. For the Week view. */
export function getDayMarkMap(fromISO: string, toISO: string): Map<string, DayMark> {
  const rows = getDb()
    .prepare(
      "SELECT date, kind, label, note FROM day_marks WHERE date BETWEEN ? AND ? ORDER BY date"
    )
    .all(fromISO, toISO) as DayMarkRow[];
  return new Map(rows.map((r) => [r.date, r]));
}

// --------------------------------------------------------- calendars

interface CalendarRow {
  id: number;
  name: string;
  subtitle: string | null;
  hue: string;
  published: number;
  sort: number;
  created_at: string;
}

interface CalendarBlockRow {
  id: number;
  calendar_id: number;
  day: number;
  start_min: number;
  end_min: number;
  label: string;
  note: string | null;
}

function mapCalendar(row: CalendarRow): Calendar {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    hue: row.hue,
    published: !!row.published,
    sort: row.sort,
    createdAt: row.created_at,
  };
}

function mapCalendarBlock(row: CalendarBlockRow): CalendarBlock {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    day: row.day,
    start: row.start_min,
    end: row.end_min,
    label: row.label,
    note: row.note,
  };
}

/**
 * Individual calendars with their weekly blocks attached (Monday-first, then by
 * start time). `publishedOnly` restricts to the calendars visible to everyone —
 * the Settings viewer passes it; the admin editor reads them all.
 */
function loadCalendars(publishedOnly: boolean): CalendarFull[] {
  const db = getDb();
  const calendars = (
    publishedOnly
      ? db.prepare("SELECT * FROM calendars WHERE published = 1 ORDER BY sort, id").all()
      : db.prepare("SELECT * FROM calendars ORDER BY sort, id").all()
  ) as CalendarRow[];
  if (calendars.length === 0) return [];

  const blocksByCal = new Map<number, CalendarBlock[]>();
  const blockRows = db
    .prepare("SELECT * FROM calendar_blocks ORDER BY start_min")
    .all() as CalendarBlockRow[];
  for (const row of blockRows) {
    const list = blocksByCal.get(row.calendar_id) ?? [];
    list.push(mapCalendarBlock(row));
    blocksByCal.set(row.calendar_id, list);
  }

  return calendars.map((row) => {
    const blocks = (blocksByCal.get(row.id) ?? []).sort(
      (a, b) => monFirstIndex(a.day) - monFirstIndex(b.day) || a.start - b.start
    );
    return { ...mapCalendar(row), blocks };
  });
}

/** Every individual calendar (admin editor). */
export function getCalendars(): CalendarFull[] {
  return loadCalendars(false);
}

/** Only the calendars marked visible to everyone (the Settings viewer). */
export function getPublishedCalendars(): CalendarFull[] {
  return loadCalendars(true);
}

export const getTaskTypes = cache((): TaskType[] => {
  return getDb().prepare("SELECT * FROM task_types ORDER BY sort, id").all() as TaskType[];
});

interface TaskSeriesRow {
  id: number;
  title: string;
  freq: TaskSeries["freq"];
  interval: number;
  weekdays: string | null;
  nth: number | null;
  weekday: number | null;
  start_date: string;
  end_date: string | null;
  count: number | null;
  created_at: string;
}

function mapSeries(row: TaskSeriesRow): TaskSeries {
  return {
    id: row.id,
    title: row.title,
    freq: row.freq,
    interval: row.interval,
    weekdays: row.weekdays
      ? row.weekdays.split(",").map(Number).filter((n) => n >= 1 && n <= 5)
      : [],
    nth: row.nth,
    weekday: row.weekday,
    startDate: row.start_date,
    endDate: row.end_date,
    count: row.count,
    createdAt: row.created_at,
  };
}

/**
 * A repeating series with how many of its occurrences exist, and how many are
 * still upcoming-and-open (what a "delete series" would remove). null when the
 * series is gone. For the task panel's series card.
 */
export function getTaskSeries(
  id: number,
  todayISO: string
): (TaskSeries & { total: number; upcomingOpen: number }) | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM task_series WHERE id = ?").get(id) as
    | TaskSeriesRow
    | undefined;
  if (!row) return null;
  const total = (db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE series_id = ?").get(id) as {
    n: number;
  }).n;
  const upcomingOpen = (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM tasks
         WHERE series_id = ? AND due_date >= ? AND status IN ('confirmed','tentative')`
      )
      .get(id, todayISO) as { n: number }
  ).n;
  return { ...mapSeries(row), total, upcomingOpen };
}

/** Tasks with subject + type resolved. `strand` filters to visible ones. */
export function getTasks(strand?: StrandCode | null): TaskFull[] {
  const db = getDb();
  const rows = (
    strand
      ? db
          .prepare(
            // visible if EITHER the class or its collab class is in this strand
            `SELECT t.* FROM tasks t
             JOIN subjects s ON s.id = t.subject_id
             LEFT JOIN subjects s2 ON s2.id = t.secondary_subject_id
             WHERE (s.strand IS NULL OR s.strand = ?)
                OR (t.secondary_subject_id IS NOT NULL AND (s2.strand IS NULL OR s2.strand = ?))
             ORDER BY t.due_date, t.due_time IS NULL, t.due_time, t.id`
          )
          .all(strand, strand)
      : db.prepare("SELECT * FROM tasks ORDER BY due_date, due_time IS NULL, due_time, id").all()
  ) as TaskRow[];

  const subjects = new Map(getSubjects().map((s) => [s.id, s]));
  const types = new Map(getTaskTypes().map((t) => [t.id, t]));
  // meeting times for the same strand view — used to resolve when a held-in-
  // class task actually happens (its subject's period on that due date)
  const periods = getPeriods(strand);

  const linksByTask = new Map<number, TaskLink[]>();
  if (rows.length) {
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => "?").join(",");
    const linkRows = db
      .prepare(
        `SELECT * FROM task_links WHERE task_id IN (${placeholders}) ORDER BY task_id, sort, id`
      )
      .all(...ids) as TaskLinkRow[];
    for (const row of linkRows) {
      const list = linksByTask.get(row.task_id) ?? [];
      list.push(mapLink(row));
      linksByTask.set(row.task_id, list);
    }
  }

  const full = rows
    .map((row) => {
      const subject = subjects.get(row.subject_id);
      const type = types.get(row.type_id);
      if (!subject || !type) return null;
      const secondarySubject =
        row.secondary_subject_id !== null
          ? (subjects.get(row.secondary_subject_id) ?? null)
          : null;
      const task = mapTask(row);
      return {
        ...task,
        subject,
        secondarySubject,
        type,
        links: linksByTask.get(row.id) ?? [],
        classMeeting: task.heldInClass ? classMeetingFor(task, periods) : null,
      };
    })
    .filter((t): t is TaskFull => t !== null);

  // the SQL ORDER BY can't see classMeeting (resolved above from the
  // schedule), so a held-in-class task with no explicit due_time would sort
  // to end-of-day instead of its actual class time — re-sort now that each
  // task's real clock minute is known.
  full.sort((a, b) => {
    if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    const am = sortMinOf(a);
    const bm = sortMinOf(b);
    if (am !== bm) return am - bm;
    return a.id - b.id;
  });

  return full;
}

/** Open (actionable) task count for the sidebar badge. */
export function getOpenTaskCount(strand?: StrandCode | null): number {
  const db = getDb();
  const row = (
    strand
      ? db
          .prepare(
            `SELECT COUNT(*) AS n FROM tasks t
             JOIN subjects s ON s.id = t.subject_id
             LEFT JOIN subjects s2 ON s2.id = t.secondary_subject_id
             WHERE t.status IN ('confirmed','tentative') AND t.done_in_class = 0
               AND ((s.strand IS NULL OR s.strand = ?)
                 OR (t.secondary_subject_id IS NOT NULL AND (s2.strand IS NULL OR s2.strand = ?)))`
          )
          .get(strand, strand)
      : db
          .prepare(
            "SELECT COUNT(*) AS n FROM tasks WHERE status IN ('confirmed','tentative') AND done_in_class = 0"
          )
          .get()
  ) as { n: number };
  return row.n;
}

/** Counts shown on the admin settings tab. */
export function getCounts(): { tasks: number; periods: number; subjects: number } {
  const db = getDb();
  const n = (sql: string) => (db.prepare(sql).get() as { n: number }).n;
  return {
    tasks: n("SELECT COUNT(*) AS n FROM tasks"),
    periods: n("SELECT COUNT(*) AS n FROM periods"),
    subjects: n("SELECT COUNT(*) AS n FROM subjects"),
  };
}

/** Full snapshot for the JSON backup download. */
export function exportAll() {
  const db = getDb();
  return {
    exportedAt: new Date().toISOString(),
    strands: db.prepare("SELECT * FROM strands").all(),
    teachers: db.prepare("SELECT * FROM teachers").all(),
    subjects: db.prepare("SELECT * FROM subjects").all(),
    periods: db.prepare("SELECT * FROM periods").all(),
    dayMarks: db.prepare("SELECT * FROM day_marks").all(),
    calendars: db.prepare("SELECT * FROM calendars").all(),
    calendarBlocks: db.prepare("SELECT * FROM calendar_blocks").all(),
    taskTypes: db.prepare("SELECT * FROM task_types").all(),
    taskSeries: db.prepare("SELECT * FROM task_series").all(),
    tasks: db.prepare("SELECT * FROM tasks").all(),
    taskLinks: db.prepare("SELECT * FROM task_links").all(),
  };
}
