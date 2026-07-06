export type Strand = "ABM" | "HUMSS" | "STEM";

export const STRANDS: Strand[] = ["ABM", "HUMSS", "STEM"];

export interface StrandInfo {
  code: Strand;
  name: string;
  tagline: string;
  color: string;
}

export const STRAND_INFO: Record<Strand, StrandInfo> = {
  ABM: {
    code: "ABM",
    name: "Accountancy, Business & Management",
    tagline: "Ledgers, markets, and future CEOs.",
    color: "#f2994a",
  },
  HUMSS: {
    code: "HUMSS",
    name: "Humanities & Social Sciences",
    tagline: "People, politics, and the written word.",
    color: "#e56aa2",
  },
  STEM: {
    code: "STEM",
    name: "Science, Technology, Engineering & Mathematics",
    tagline: "Lab coats, limits, and laws of motion.",
    color: "#58a6ff",
  },
};

export type TaskType = "assignment" | "quiz" | "ut" | "peta" | "project";

export interface TaskTypeInfo {
  id: TaskType;
  label: string;
  short: string;
  color: string;
  hint: string;
}

export const TASK_TYPES: Record<TaskType, TaskTypeInfo> = {
  assignment: {
    id: "assignment",
    label: "Assignment",
    short: "ASG",
    color: "#6e79d6",
    hint: "Written work or homework",
  },
  quiz: {
    id: "quiz",
    label: "Quiz",
    short: "QUIZ",
    color: "#26b5ce",
    hint: "Short graded check",
  },
  ut: {
    id: "ut",
    label: "Unit Test",
    short: "UT",
    color: "#f0883e",
    hint: "Major written exam per unit",
  },
  peta: {
    id: "peta",
    label: "PETA",
    short: "PETA",
    color: "#b07ce8",
    hint: "Performance task / output",
  },
  project: {
    id: "project",
    label: "Project",
    short: "PROJ",
    color: "#4cb782",
    hint: "Long-running group or solo output",
  },
};

export const TASK_TYPE_ORDER: TaskType[] = [
  "assignment",
  "quiz",
  "ut",
  "peta",
  "project",
];

/** A subject/class. `strands` with all three = core subject. */
export interface SchoolClass {
  id: string;
  name: string;
  code: string;
  teacher: string;
  schedule: string;
  room: string;
  strands: Strand[];
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  classId: string;
  /** ISO datetime string */
  dueAt: string;
  points: number | null;
  link: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  version: number;
  classes: SchoolClass[];
  tasks: Task[];
}

export interface Prefs {
  strand: Strand | null;
  /** Task ids the current user checked off (kept per browser). */
  done: string[];
}

export const CLASS_COLORS = [
  "#5e6ad2",
  "#26b5ce",
  "#4cb782",
  "#f2c94c",
  "#f0883e",
  "#eb5757",
  "#e56aa2",
  "#b07ce8",
  "#58a6ff",
  "#95a2b3",
] as const;

export function isCoreClass(c: SchoolClass): boolean {
  return c.strands.length === STRANDS.length;
}
