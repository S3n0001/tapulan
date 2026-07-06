import type { Database } from "better-sqlite3";

/**
 * One-time seed, transcribed from the section's printed class program
 * (Grade 12 – St. Lorenzo Ruiz, SY 2026–2027) with the section's own
 * corrections applied. It runs only when the database is empty — after
 * that the data belongs to the admins and is edited inside the app.
 *
 * Note: Friday's General Chemistry 1 block is credited to Ms. Abe on the
 * printed program (Wednesday says Mr. Vargas). Seeded as written — fix in
 * Admin → Schedule if the print was wrong.
 */

/** "7:45" → minutes, reading school hours (anything before 7 is PM). */
function t(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h < 7 ? h + 12 : h) * 60 + m;
}

const STRANDS = [
  {
    code: "STEM",
    name: "Science, Technology, Engineering & Mathematics",
    tagline: "Lab coats, limits, and laws of motion.",
    hue: "sky",
  },
  {
    code: "ABM",
    name: "Accountancy, Business & Management",
    tagline: "Ledgers, markets, and margins.",
    hue: "amber",
  },
  {
    code: "HUMSS",
    name: "Humanities & Social Sciences",
    tagline: "People, politics, and the written word.",
    hue: "fuchsia",
  },
];

const TEACHERS = {
  abe: { name: "Ms. Abe", note: "General Physics 1" },
  patan: { name: "Mme. Patan", note: "FABM 2" },
  carunday: { name: "Mr. Canuday", note: "CESC" },
  ruiz: { name: "Sr. Pable", note: "PE & Health" },
  jorairah: { name: "Sr. Jorairah", note: "Christian Living Education" },
  cardines: { name: "Mme. Cardines", note: "Media & Information Literacy" },
  san: { name: "Ms. San", note: "Contemporary Philippine Arts from the Regions" },
  bacu: { name: "Mdm. Bacus", note: "Pagsulat sa Filipino sa Piling Larang" },
  gomez: { name: "Ms. Gomez", note: "Practical Research 2" },
  mercado: { name: "Ms. Mercado", note: "EAPP · Creative Nonfiction" },
  lagura: { name: "Mme. Lagura", note: "Personal Development" },
  vargas: { name: "Mr. Vargas", note: "General Chemistry 1" },
  cabatuan: { name: "Mme. Cabatuan", note: "Principles of Marketing" },
} as const;

type TeacherKey = keyof typeof TEACHERS;

const SUBJECTS = {
  pe: { name: "PE & Health", short: "PE", teacher: "ruiz", strand: null, hue: "lime" },
  cle: { name: "Christian Living Education", short: "CLE", teacher: "jorairah", strand: null, hue: "violet" },
  mil: { name: "Media & Information Literacy", short: "MIL", teacher: "cardines", strand: null, hue: "cyan" },
  cpar: { name: "Contemporary Philippine Arts from the Regions", short: "CPAR", teacher: "san", strand: null, hue: "fuchsia" },
  fil: { name: "Pagsulat sa Filipino sa Piling Larang", short: "FIL", teacher: "bacu", strand: null, hue: "amber" },
  pr2: { name: "Practical Research 2", short: "PR2", teacher: "gomez", strand: null, hue: "teal" },
  eapp: { name: "English for Academic & Professional Purposes", short: "EAPP", teacher: "mercado", strand: null, hue: "blue" },
  perdev: { name: "Personal Development", short: "PERDEV", teacher: "lagura", strand: null, hue: "rose" },
  ace: { name: "Aralinks Coding Education", short: "ACE", teacher: null, strand: null, hue: "indigo" },
  phys: { name: "General Physics 1", short: "PHYSICS", teacher: "abe", strand: "STEM", hue: "sky" },
  chem: { name: "General Chemistry 1", short: "CHEM", teacher: "vargas", strand: "STEM", hue: "emerald" },
  fabm: { name: "FABM 2", short: "FABM", teacher: "patan", strand: "ABM", hue: "orange" },
  mktg: { name: "Principles of Marketing", short: "MKTG", teacher: "cabatuan", strand: "ABM", hue: "red" },
  cesc: { name: "Community Engagement, Solidarity & Citizenship", short: "CESC", teacher: "carunday", strand: "HUMSS", hue: "emerald" },
  cnf: { name: "Creative Nonfiction", short: "CNF", teacher: "mercado", strand: "HUMSS", hue: "orange" },
} as const;

type SubjectKey = keyof typeof SUBJECTS;

interface PeriodSpec {
  day: number;
  start: number;
  end: number;
  kind: "class" | "break" | "fixture";
  label?: string;
  subject?: SubjectKey;
  strand?: "STEM" | "ABM" | "HUMSS";
  /** teacher override for this meeting only */
  teacher?: TeacherKey;
}

const p = (
  day: number,
  start: string,
  end: string,
  rest: Omit<PeriodSpec, "day" | "start" | "end">
): PeriodSpec => ({ day, start: t(start), end: t(end), ...rest });

/** One strand-split block = three rows, one per strand. */
const split = (
  day: number,
  start: string,
  end: string,
  bySubject: Partial<Record<"STEM" | "ABM" | "HUMSS", SubjectKey>>,
  overrides?: Partial<Record<"STEM" | "ABM" | "HUMSS", TeacherKey>>
): PeriodSpec[] =>
  (Object.entries(bySubject) as ["STEM" | "ABM" | "HUMSS", SubjectKey][]).map(([strand, subject]) =>
    p(day, start, end, { kind: "class", subject, strand, teacher: overrides?.[strand] })
  );

const PERIODS: PeriodSpec[] = [
  // ------------------------------------------------------------- Monday
  p(1, "7:00", "7:30", { kind: "fixture", label: "Morning Assembly" }),
  p(1, "7:30", "7:45", { kind: "fixture", label: "Homeroom" }),
  ...split(1, "7:45", "9:15", { STEM: "phys", ABM: "fabm", HUMSS: "cesc" }),
  p(1, "9:15", "9:35", { kind: "break", label: "Recess" }),
  p(1, "9:35", "11:05", { kind: "class", subject: "pe" }),
  p(1, "11:05", "11:45", { kind: "break", label: "Lunch Break" }),
  p(1, "11:45", "1:15", { kind: "class", subject: "cle" }),
  p(1, "1:15", "1:25", { kind: "break", label: "Afternoon Break" }),
  p(1, "1:25", "2:55", { kind: "class", subject: "mil" }),
  p(1, "2:55", "3:15", { kind: "fixture", label: "Cleaning" }),

  // ------------------------------------------------------------ Tuesday
  p(2, "7:45", "9:15", { kind: "class", subject: "cpar" }),
  p(2, "9:15", "9:35", { kind: "break", label: "Recess" }),
  p(2, "9:35", "11:05", { kind: "class", subject: "fil" }),
  p(2, "11:05", "11:45", { kind: "break", label: "Lunch Break" }),
  p(2, "11:45", "1:15", { kind: "class", subject: "pr2" }),
  p(2, "1:15", "1:25", { kind: "break", label: "Afternoon Break" }),
  p(2, "1:25", "2:55", { kind: "class", subject: "eapp" }),
  p(2, "2:55", "3:15", { kind: "fixture", label: "Cleaning" }),

  // ---------------------------------------------------------- Wednesday
  p(3, "7:45", "9:15", { kind: "class", subject: "mil" }),
  p(3, "9:15", "9:35", { kind: "break", label: "Recess" }),
  p(3, "9:35", "11:05", { kind: "class", subject: "perdev" }),
  p(3, "11:05", "11:45", { kind: "break", label: "Lunch Break" }),
  p(3, "11:45", "1:15", { kind: "class", subject: "cle" }),
  p(3, "1:15", "1:25", { kind: "break", label: "Afternoon Break" }),
  ...split(3, "1:25", "2:55", { STEM: "chem", ABM: "mktg", HUMSS: "cnf" }),
  p(3, "2:55", "3:40", { kind: "class", subject: "ace" }),
  p(3, "3:40", "4:00", { kind: "fixture", label: "Cleaning" }),

  // ----------------------------------------------------------- Thursday
  p(4, "7:45", "9:15", { kind: "class", subject: "cpar" }),
  p(4, "9:15", "9:35", { kind: "break", label: "Recess" }),
  p(4, "9:35", "11:05", { kind: "class", subject: "eapp" }),
  p(4, "11:05", "11:45", { kind: "break", label: "Lunch Break" }),
  p(4, "11:45", "1:15", { kind: "class", subject: "fil" }),
  p(4, "1:15", "1:25", { kind: "break", label: "Afternoon Break" }),
  ...split(4, "1:25", "2:55", { STEM: "phys", ABM: "fabm", HUMSS: "cesc" }),
  p(4, "2:55", "3:40", { kind: "class", subject: "ace" }),
  p(4, "3:40", "4:00", { kind: "fixture", label: "Cleaning" }),

  // ------------------------------------------------------------- Friday
  p(5, "7:45", "8:30", { kind: "fixture", label: "Song Practice" }),
  p(5, "8:30", "9:15", { kind: "fixture", label: "Guidance" }),
  p(5, "9:15", "9:35", { kind: "break", label: "Recess" }),
  // Chem credited to Mr. Abe here on the printed program — seeded as written.
  ...split(5, "9:35", "10:25", { STEM: "chem", ABM: "mktg", HUMSS: "cnf" }, { STEM: "abe" }),
  p(5, "10:25", "11:10", { kind: "class", subject: "perdev" }),
  p(5, "11:10", "11:50", { kind: "break", label: "Lunch Break" }),
  p(5, "11:50", "12:25", { kind: "class", subject: "perdev" }),
  p(5, "12:25", "1:00", { kind: "class", subject: "pr2" }),
  p(5, "1:00", "1:10", { kind: "break", label: "Afternoon Break" }),
  p(5, "1:10", "1:45", { kind: "class", subject: "pr2" }),
  p(5, "1:45", "2:10", { kind: "fixture", label: "Adviser's Period / Cleaning" }),
  p(5, "2:10", "4:00", { kind: "fixture", label: "SSG" }),
];

const TASK_TYPES = [
  { name: "Unit Test", short: "UT", hue: "red", sort: 1 },
  { name: "Quiz", short: "QUIZ", hue: "orange", sort: 2 },
  { name: "Assignment", short: "HW", hue: "blue", sort: 3 },
  { name: "Lab", short: "LAB", hue: "cyan", sort: 4 },
  { name: "PETA", short: "PETA", hue: "violet", sort: 5 },
  { name: "Project", short: "PROJ", hue: "emerald", sort: 6 },
  { name: "Event", short: "EVENT", hue: "fuchsia", sort: 7 },
  { name: "Reminder", short: "NOTE", hue: "slate", sort: 8 },
];

interface TaskSpec {
  subject: SubjectKey;
  type: string; // task type short
  title: string;
  details: string;
  /** absolute local date, YYYY-MM-DD */
  due: string;
  /** minutes from midnight */
  time?: number;
  status?: "confirmed" | "tentative" | "done" | "cancelled";
  /** original YYYY-MM-DD when the date was moved (renders the moved badge) */
  movedFrom?: string;
  note?: string;
  points?: number;
  /** materials — links and shared folders */
  links?: { label: string; url: string }[];
}

/** The section's real requirements, as announced. Admins own them from here. */
const TASKS: TaskSpec[] = [
  {
    subject: "eapp",
    type: "UT",
    title: "Mastery test",
    details: "",
    due: "2026-07-07",
    time: t("1:25"),
    links: [
      {
        label: "Learning materials",
        url: "https://drive.google.com/drive/folders/1aPRQaUaK-YncihWNk4SHu3Em-OsShJVL?usp=sharing",
      },
    ],
  },
  {
    subject: "cpar",
    type: "QUIZ",
    title: "Quiz",
    details: "",
    due: "2026-07-07",
    time: t("7:45"),
  },
  {
    subject: "chem",
    type: "UT",
    title: "UT 1.1",
    details: "Covers: Accurate measurement.",
    due: "2026-07-07",
  },
];

export function seedDatabase(db: Database, now: Date = new Date()): void {
  const insertStrand = db.prepare(
    "INSERT INTO strands (code, name, tagline, hue) VALUES (?, ?, ?, ?)"
  );
  const insertTeacher = db.prepare("INSERT INTO teachers (name, note) VALUES (?, ?)");
  const insertSubject = db.prepare(
    "INSERT INTO subjects (name, short, teacher_id, strand, hue, room) VALUES (?, ?, ?, ?, ?, NULL)"
  );
  const insertPeriod = db.prepare(
    "INSERT INTO periods (day, start_min, end_min, kind, label, subject_id, teacher_id, strand) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertType = db.prepare(
    "INSERT INTO task_types (name, short, hue, sort) VALUES (?, ?, ?, ?)"
  );
  const insertTask = db.prepare(
    `INSERT INTO tasks (title, details, subject_id, type_id, due_date, due_time, status, moved_from, note, points, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertLink = db.prepare(
    "INSERT INTO task_links (task_id, label, url, kind, sort) VALUES (?, ?, ?, 'link', ?)"
  );

  const run = db.transaction(() => {
    for (const s of STRANDS) insertStrand.run(s.code, s.name, s.tagline, s.hue);

    const teacherIds = {} as Record<TeacherKey, number>;
    for (const [key, tt] of Object.entries(TEACHERS) as [TeacherKey, (typeof TEACHERS)[TeacherKey]][]) {
      teacherIds[key] = Number(insertTeacher.run(tt.name, tt.note).lastInsertRowid);
    }

    const subjectIds = {} as Record<SubjectKey, number>;
    for (const [key, s] of Object.entries(SUBJECTS) as [SubjectKey, (typeof SUBJECTS)[SubjectKey]][]) {
      subjectIds[key] = Number(
        insertSubject.run(s.name, s.short, s.teacher ? teacherIds[s.teacher] : null, s.strand, s.hue)
          .lastInsertRowid
      );
    }

    for (const spec of PERIODS) {
      insertPeriod.run(
        spec.day,
        spec.start,
        spec.end,
        spec.kind,
        spec.label ?? null,
        spec.subject ? subjectIds[spec.subject] : null,
        spec.teacher ? teacherIds[spec.teacher] : null,
        spec.strand ?? null
      );
    }

    const typeIds = new Map<string, number>();
    for (const tt of TASK_TYPES) {
      typeIds.set(tt.short, Number(insertType.run(tt.name, tt.short, tt.hue, tt.sort).lastInsertRowid));
    }

    const created = now.toISOString();
    for (const task of TASKS) {
      const info = insertTask.run(
        task.title,
        task.details,
        subjectIds[task.subject],
        typeIds.get(task.type)!,
        task.due,
        task.time ?? null,
        task.status ?? "confirmed",
        task.movedFrom ?? null,
        task.note ?? null,
        task.points ?? null,
        created,
        created
      );
      task.links?.forEach((link, i) => {
        insertLink.run(Number(info.lastInsertRowid), link.label, link.url, i);
      });
    }
  });

  run();
}
