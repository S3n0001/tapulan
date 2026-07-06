import type { Database, SchoolClass, Task, TaskType } from "./types";

export const DB_VERSION = 1;

/**
 * Grade 11 · First Semester subject load.
 * Core subjects are taken by every strand; majors belong to one strand.
 */
export const SEED_CLASSES: SchoolClass[] = [
  // ------------------------------------------------------------- core
  {
    id: "cls-oralcom",
    name: "Oral Communication",
    code: "ORALCOM",
    teacher: "Ms. Bianca Ramos",
    schedule: "MWF · 7:30–8:30 AM",
    room: "Rm 201",
    strands: ["ABM", "HUMSS", "STEM"],
    color: "#26b5ce",
  },
  {
    id: "cls-kompan",
    name: "Komunikasyon at Pananaliksik",
    code: "KOMPAN",
    teacher: "Gng. Liza Manalo",
    schedule: "TTh · 7:30–9:00 AM",
    room: "Rm 202",
    strands: ["ABM", "HUMSS", "STEM"],
    color: "#f2c94c",
  },
  {
    id: "cls-genmath",
    name: "General Mathematics",
    code: "GENMATH",
    teacher: "Mr. Paolo Dizon",
    schedule: "MWF · 8:30–9:30 AM",
    room: "Rm 203",
    strands: ["ABM", "HUMSS", "STEM"],
    color: "#5e6ad2",
  },
  {
    id: "cls-els",
    name: "Earth and Life Science",
    code: "ELS",
    teacher: "Ms. Katrina Uy",
    schedule: "TTh · 9:15–10:45 AM",
    room: "Sci Lab 1",
    strands: ["ABM", "HUMSS", "STEM"],
    color: "#4cb782",
  },
  {
    id: "cls-ucsp",
    name: "Understanding Culture, Society & Politics",
    code: "UCSP",
    teacher: "Mr. Noel Bautista",
    schedule: "MWF · 10:00–11:00 AM",
    room: "Rm 204",
    strands: ["ABM", "HUMSS", "STEM"],
    color: "#f0883e",
  },
  {
    id: "cls-perdev",
    name: "Personal Development",
    code: "PERDEV",
    teacher: "Ms. Joyce Salvador",
    schedule: "TTh · 1:00–2:30 PM",
    room: "Rm 205",
    strands: ["ABM", "HUMSS", "STEM"],
    color: "#e56aa2",
  },
  {
    id: "cls-peh",
    name: "Physical Education and Health 1",
    code: "PEH 1",
    teacher: "Coach Rey Villanueva",
    schedule: "F · 1:00–3:00 PM",
    room: "Gymnasium",
    strands: ["ABM", "HUMSS", "STEM"],
    color: "#95a2b3",
  },

  // ------------------------------------------------------- ABM majors
  {
    id: "cls-fabm1",
    name: "Fundamentals of ABM 1",
    code: "FABM 1",
    teacher: "Mrs. Cecilia Tan",
    schedule: "MWF · 1:00–2:00 PM",
    room: "Rm 301",
    strands: ["ABM"],
    color: "#f2994a",
  },
  {
    id: "cls-orgman",
    name: "Organization and Management",
    code: "ORGMAN",
    teacher: "Mr. Alvin Chua",
    schedule: "TTh · 10:45 AM–12:15 PM",
    room: "Rm 302",
    strands: ["ABM"],
    color: "#eb5757",
  },
  {
    id: "cls-busmath",
    name: "Business Mathematics",
    code: "BUSMATH",
    teacher: "Ms. Grace Lim",
    schedule: "MWF · 2:00–3:00 PM",
    room: "Rm 303",
    strands: ["ABM"],
    color: "#4cb782",
  },

  // ----------------------------------------------------- HUMSS majors
  {
    id: "cls-cw",
    name: "Creative Writing",
    code: "CW",
    teacher: "Mr. Miguel Santos",
    schedule: "MWF · 1:00–2:00 PM",
    room: "Rm 304",
    strands: ["HUMSS"],
    color: "#b07ce8",
  },
  {
    id: "cls-ppg",
    name: "Philippine Politics and Governance",
    code: "PPG",
    teacher: "Atty. Rosa Ferrer",
    schedule: "TTh · 10:45 AM–12:15 PM",
    room: "Rm 305",
    strands: ["HUMSS"],
    color: "#eb5757",
  },
  {
    id: "cls-diss",
    name: "Disciplines and Ideas in the Social Sciences",
    code: "DISS",
    teacher: "Ms. Hannah Aquino",
    schedule: "MWF · 2:00–3:00 PM",
    room: "Rm 306",
    strands: ["HUMSS"],
    color: "#26b5ce",
  },

  // ------------------------------------------------------ STEM majors
  {
    id: "cls-precal",
    name: "Pre-Calculus",
    code: "PRECAL",
    teacher: "Engr. Marco Lopez",
    schedule: "MWF · 1:00–2:00 PM",
    room: "Rm 307",
    strands: ["STEM"],
    color: "#58a6ff",
  },
  {
    id: "cls-genbio1",
    name: "General Biology 1",
    code: "GENBIO 1",
    teacher: "Dr. Elena Cruz",
    schedule: "TTh · 10:45 AM–12:15 PM",
    room: "Sci Lab 2",
    strands: ["STEM"],
    color: "#4cb782",
  },
  {
    id: "cls-genchem1",
    name: "General Chemistry 1",
    code: "GENCHEM 1",
    teacher: "Mr. Dominic Yap",
    schedule: "MWF · 2:00–3:30 PM",
    room: "Sci Lab 3",
    strands: ["STEM"],
    color: "#f0883e",
  },
];

interface SeedTaskSpec {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  classId: string;
  /** Days from "now". Negative = already overdue. */
  dueInDays: number;
  /** 24h hour of day the task is due (default 23:59). */
  dueHour?: number;
  points?: number;
  link?: string;
}

const SEED_TASK_SPECS: SeedTaskSpec[] = [
  {
    id: "task-oralcom-speech",
    title: "Self-introduction speech outline",
    description:
      "Draft a one-page outline for your 3-minute self-introduction speech. Include your hook, three key points, and closing line. Follow the outline template uploaded in class — handwritten or printed both accepted.",
    type: "assignment",
    classId: "cls-oralcom",
    dueInDays: -1,
    dueHour: 8,
    points: 20,
  },
  {
    id: "task-genmath-functions",
    title: "Problem set: Functions & their graphs",
    description:
      "Answer items 1–15 on pages 34–36 of the workbook. Show complete solutions — final answers without solutions get half credit. Write on yellow paper, one column per page.",
    type: "assignment",
    classId: "cls-genmath",
    dueInDays: 0,
    dueHour: 9,
    points: 30,
  },
  {
    id: "task-els-quiz",
    title: "Quiz 1: Origin of the universe",
    description:
      "Coverage: Big Bang theory, solar nebular theory, and characteristics of Earth that support life (Weeks 1–2 slides). 25 items, multiple choice + 5 short answer.",
    type: "quiz",
    classId: "cls-els",
    dueInDays: 1,
    dueHour: 9,
    points: 30,
  },
  {
    id: "task-kompan-talumpati",
    title: "Talumpati: Wikang Filipino sa makabagong panahon",
    description:
      "Sumulat ng maikling talumpati (300–400 salita) tungkol sa kahalagahan ng wikang Filipino sa panahon ng social media. Isumite ang soft copy sa Google Classroom bago ang klase.",
    type: "assignment",
    classId: "cls-kompan",
    dueInDays: 2,
    dueHour: 7,
    points: 25,
  },
  {
    id: "task-ucsp-fieldnotes",
    title: "Mini-ethnography field notes",
    description:
      "Observe one public space in your barangay for 30 minutes (sari-sari store, basketball court, terminal, etc.). Record what people do, who interacts with whom, and any unwritten rules you notice. 2 pages minimum, to be used for the UCSP PETA.",
    type: "assignment",
    classId: "cls-ucsp",
    dueInDays: 3,
    dueHour: 10,
    points: 20,
  },
  {
    id: "task-perdev-journal",
    title: "PETA 1: Personal timeline & reflection",
    description:
      "Create a creative timeline of 8–10 milestones in your life (poster, scrapbook page, or digital art), then write a one-page reflection connecting it to the concept of developmental stages. Rubric posted in Google Classroom.",
    type: "peta",
    classId: "cls-perdev",
    dueInDays: 4,
    dueHour: 13,
    points: 50,
  },
  {
    id: "task-genmath-ut",
    title: "Unit Test 1: Functions",
    description:
      "Coverage: evaluating functions, operations on functions, composition, rational functions and their graphs. Bring scientific calculator — sharing is not allowed. 50 points, 1 hour.",
    type: "ut",
    classId: "cls-genmath",
    dueInDays: 6,
    dueHour: 8,
    points: 50,
  },
  {
    id: "task-els-poster",
    title: "PETA: Earth subsystems infographic",
    description:
      "In pairs, design an A3 infographic showing how the geosphere, hydrosphere, atmosphere, and biosphere interact in one real Philippine ecosystem (e.g., Taal Lake, Chocolate Hills). Cite at least 3 sources.",
    type: "peta",
    classId: "cls-els",
    dueInDays: 9,
    dueHour: 9,
    points: 60,
  },
  {
    id: "task-oralcom-ut",
    title: "Unit Test 1: Nature & elements of communication",
    description:
      "Coverage: communication models (linear, interactive, transactional), barriers to communication, and intercultural communication. Mostly situational items — review the case studies discussed in class.",
    type: "ut",
    classId: "cls-oralcom",
    dueInDays: 11,
    dueHour: 7,
    points: 50,
  },
  {
    id: "task-peh-fitness",
    title: "Fitness log — Week 1–4",
    description:
      "Log your daily physical activity for four weeks using the provided template (activity, duration, intensity, heart rate). Have a parent/guardian sign each week. Submit the compiled log after the fourth week.",
    type: "project",
    classId: "cls-peh",
    dueInDays: 16,
    dueHour: 13,
    points: 40,
  },

  // ------------------------------------------------------- ABM majors
  {
    id: "task-fabm1-journal",
    title: "Journalizing drill: Service business transactions",
    description:
      "Journalize the 20 transactions of 'Lakbay Laundry Services' handout. Use the two-column journal format. Watch out for compound entries — items 7, 12, and 18.",
    type: "assignment",
    classId: "cls-fabm1",
    dueInDays: 1,
    dueHour: 13,
    points: 25,
  },
  {
    id: "task-orgman-quiz",
    title: "Quiz 1: Management theories",
    description:
      "Coverage: scientific management (Taylor), administrative management (Fayol's 14 principles), and human relations approach (Mayo). 20 items.",
    type: "quiz",
    classId: "cls-orgman",
    dueInDays: 5,
    dueHour: 11,
    points: 20,
  },
  {
    id: "task-busmath-peta",
    title: "PETA: Sari-sari store pricing study",
    description:
      "Interview one sari-sari store owner. Compute markup, markdown, and margin for 10 products, then present your findings in a one-page report with a summary table. Include a photo of the store (with permission).",
    type: "peta",
    classId: "cls-busmath",
    dueInDays: 12,
    dueHour: 14,
    points: 60,
  },

  // ----------------------------------------------------- HUMSS majors
  {
    id: "task-cw-poem",
    title: "Imagery exercise: Three sensory poems",
    description:
      "Write three short poems (6–10 lines each), one focused on sight, one on sound, one on touch. Avoid clichés — we will workshop these in class, so bring two printed copies.",
    type: "assignment",
    classId: "cls-cw",
    dueInDays: 1,
    dueHour: 13,
    points: 30,
  },
  {
    id: "task-ppg-debate",
    title: "PETA: Mock senate debate",
    description:
      "Team debate on the proposed 'Single-Use Plastics Ban'. You will be graded on evidence, delivery, and rebuttals. Position papers (2 pages) due at the start of the debate.",
    type: "peta",
    classId: "cls-ppg",
    dueInDays: 8,
    dueHour: 11,
    points: 60,
  },
  {
    id: "task-diss-ut",
    title: "Unit Test 1: Emergence of social sciences",
    description:
      "Coverage: Enlightenment roots of the social sciences, and the focus + methods of anthropology, sociology, and political science. Essay portion: compare two disciplines' approaches to one social issue.",
    type: "ut",
    classId: "cls-diss",
    dueInDays: 13,
    dueHour: 14,
    points: 50,
  },

  // ------------------------------------------------------ STEM majors
  {
    id: "task-precal-conics",
    title: "Problem set: Circles & parabolas",
    description:
      "Solve items 1–12 on the conic sections worksheet: standard form, completing the square, and graphing. Graphs must be on graphing paper with labeled vertices, foci, and directrices.",
    type: "assignment",
    classId: "cls-precal",
    dueInDays: 0,
    dueHour: 13,
    points: 36,
  },
  {
    id: "task-genbio1-lab",
    title: "Lab report: Microscopy & cell structures",
    description:
      "Write the formal lab report for the onion cell + cheek cell microscopy activity. Follow the IMRaD format. Include labeled drawings at 100x and 400x magnification.",
    type: "assignment",
    classId: "cls-genbio1",
    dueInDays: 4,
    dueHour: 11,
    points: 40,
  },
  {
    id: "task-genchem1-quiz",
    title: "Quiz 2: Significant figures & measurement",
    description:
      "Coverage: SI units, scientific notation, significant figures in calculations, accuracy vs precision, and density problems. Bring your own calculator.",
    type: "quiz",
    classId: "cls-genchem1",
    dueInDays: 2,
    dueHour: 14,
    points: 25,
  },
  {
    id: "task-precal-ut",
    title: "Unit Test 1: Conic sections",
    description:
      "Coverage: circles, parabolas, ellipses, and hyperbolas — identifying, converting to standard form, graphing, and word problems (orbit and reflector applications). 60 points, 90 minutes.",
    type: "ut",
    classId: "cls-precal",
    dueInDays: 10,
    dueHour: 13,
    points: 60,
  },
  {
    id: "task-genbio1-peta",
    title: "PETA: 3D cell model",
    description:
      "Build a labeled 3D model of a plant or animal cell using recycled materials only. Prepare a 2-minute defense explaining the function of each organelle. Judged on accuracy, creativity, and materials.",
    type: "peta",
    classId: "cls-genbio1",
    dueInDays: 15,
    dueHour: 11,
    points: 70,
  },
];

/** Build seed tasks with due dates relative to `now` so the demo data always feels current. */
export function buildSeedTasks(now: Date): Task[] {
  const created = now.toISOString();
  return SEED_TASK_SPECS.map((spec) => {
    const due = new Date(now);
    due.setDate(due.getDate() + spec.dueInDays);
    due.setHours(spec.dueHour ?? 23, spec.dueHour ? 0 : 59, 0, 0);
    return {
      id: spec.id,
      title: spec.title,
      description: spec.description,
      type: spec.type,
      classId: spec.classId,
      dueAt: due.toISOString(),
      points: spec.points ?? null,
      link: spec.link ?? null,
      createdAt: created,
      updatedAt: created,
    };
  });
}

export function buildSeedDatabase(now: Date = new Date()): Database {
  return {
    version: DB_VERSION,
    classes: SEED_CLASSES.map((c) => ({ ...c, strands: [...c.strands] })),
    tasks: buildSeedTasks(now),
  };
}
