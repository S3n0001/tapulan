import "server-only";
import { getDb, getMeta } from "@/lib/db";
import type {
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
  type_id: number;
  due_date: string;
  due_time: number | null;
  status: Task["status"];
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
    typeId: row.type_id,
    dueDate: row.due_date,
    dueTime: row.due_time,
    status: row.status,
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

export function getTeachers(): Teacher[] {
  return (getDb().prepare("SELECT * FROM teachers ORDER BY name").all() as TeacherRow[]).map(
    mapTeacher
  );
}

/** Subjects with teacher resolved. `strand` filters to core + that strand. */
export function getSubjects(strand?: StrandCode | null): SubjectFull[] {
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
}

/**
 * The week's periods with subject + teacher resolved, ordered by day and
 * start time. With a strand: that strand's view (core rows + its splits).
 * Without: every row (admin).
 */
export function getPeriods(strand?: StrandCode | null): PeriodFull[] {
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
}

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

export function getTaskTypes(): TaskType[] {
  return getDb().prepare("SELECT * FROM task_types ORDER BY sort, id").all() as TaskType[];
}

/** Tasks with subject + type resolved. `strand` filters to visible ones. */
export function getTasks(strand?: StrandCode | null): TaskFull[] {
  const db = getDb();
  const rows = (
    strand
      ? db
          .prepare(
            `SELECT t.* FROM tasks t
             JOIN subjects s ON s.id = t.subject_id
             WHERE s.strand IS NULL OR s.strand = ?
             ORDER BY t.due_date, t.due_time IS NULL, t.due_time, t.id`
          )
          .all(strand)
      : db.prepare("SELECT * FROM tasks ORDER BY due_date, due_time IS NULL, due_time, id").all()
  ) as TaskRow[];

  const subjects = new Map(getSubjects().map((s) => [s.id, s]));
  const types = new Map(getTaskTypes().map((t) => [t.id, t]));

  const linkRows = db
    .prepare("SELECT * FROM task_links ORDER BY task_id, sort, id")
    .all() as TaskLinkRow[];
  const linksByTask = new Map<number, TaskLink[]>();
  for (const row of linkRows) {
    const list = linksByTask.get(row.task_id) ?? [];
    list.push(mapLink(row));
    linksByTask.set(row.task_id, list);
  }

  return rows
    .map((row) => {
      const subject = subjects.get(row.subject_id);
      const type = types.get(row.type_id);
      if (!subject || !type) return null;
      return { ...mapTask(row), subject, type, links: linksByTask.get(row.id) ?? [] };
    })
    .filter((t): t is TaskFull => t !== null);
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
             WHERE t.status IN ('confirmed','tentative')
               AND (s.strand IS NULL OR s.strand = ?)`
          )
          .get(strand)
      : db
          .prepare("SELECT COUNT(*) AS n FROM tasks WHERE status IN ('confirmed','tentative')")
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
    taskTypes: db.prepare("SELECT * FROM task_types").all(),
    tasks: db.prepare("SELECT * FROM tasks").all(),
    taskLinks: db.prepare("SELECT * FROM task_links").all(),
  };
}
