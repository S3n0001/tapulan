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

/** class = a subject meets · break = recess/lunch · fixture = assembly, cleaning, SSG… */
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

export interface TaskType {
  id: number;
  name: string;
  short: string;
  hue: string;
  sort: number;
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
  typeId: number;
  /** YYYY-MM-DD (local) */
  dueDate: string;
  /** minutes from midnight, null = end of day */
  dueTime: number | null;
  status: TaskStatus;
  /** original YYYY-MM-DD when the date was moved */
  movedFrom: string | null;
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

export interface TaskFull extends Task {
  subject: SubjectFull;
  type: TaskType;
  links: TaskLink[];
}

export interface Settings {
  sectionName: string;
  schoolYear: string;
}
