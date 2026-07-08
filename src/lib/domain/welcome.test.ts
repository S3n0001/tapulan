import { describe, expect, it } from "vitest";
import { sectionStatus } from "./welcome";
import type { DayMark, PeriodFull, SubjectFull, TaskFull, TaskType, Teacher } from "./types";

const teacher: Teacher = { id: 1, name: "Ms. Abe", note: null };

const subject: SubjectFull = {
  id: 10,
  name: "General Chemistry 1",
  short: "CHEM",
  teacherId: 1,
  strand: "STEM",
  hue: "emerald",
  room: null,
  teacher,
};

const type: TaskType = { id: 1, name: "Unit Test", short: "UT", hue: "red", sort: 1 };

function task(overrides: Partial<TaskFull>): TaskFull {
  return {
    id: 1,
    title: "Task",
    details: "",
    subjectId: subject.id,
    secondarySubjectId: null,
    seriesId: null,
    typeId: type.id,
    dueDate: "2026-07-17",
    dueTime: null,
    status: "confirmed",
    doneInClass: false,
    heldInClass: false,
    movedFrom: null,
    cancelReason: null,
    note: null,
    points: null,
    createdAt: "",
    updatedAt: "",
    subject,
    secondarySubject: null,
    type,
    links: [],
    classMeeting: null,
    ...overrides,
  };
}

function period(overrides: Partial<PeriodFull>): PeriodFull {
  return {
    id: 1,
    day: 3, // Wednesday
    start: 465, // 7:45
    end: 555,
    kind: "class",
    label: null,
    subjectId: subject.id,
    teacherId: null,
    strand: null,
    subject,
    teacher,
    ...overrides,
  };
}

// Wed Jul 8 2026, 9:00 AM (the seed week's async day); Sat Jul 11 rolls to Mon Jul 13.
const wed = new Date(2026, 6, 8, 9, 0);
const sat = new Date(2026, 6, 11, 9, 0);

const asyncMark: DayMark = {
  date: "2026-07-08",
  kind: "async",
  label: null,
  note: "No in-person class — work through the day's subjects on your own.",
};

describe("sectionStatus", () => {
  it("async day: no first class, correct open / nearest / overdue counts", () => {
    const tasks = [
      task({ id: 1, title: "Folk-dance showcase", dueDate: "2026-07-17" }), // upcoming
      task({ id: 2, title: "Mastery test", dueDate: "2026-07-07" }), // overdue (yesterday)
      task({ id: 3, title: "Old quiz", dueDate: "2026-07-08", status: "cancelled" }), // not actionable
      task({ id: 4, title: "Finished lab", dueDate: "2026-07-09", status: "done" }), // not actionable
    ];
    const s = sectionStatus([period({})], asyncMark, tasks, wed);

    expect(s.dateISO).toBe("2026-07-08");
    expect(s.isSchoolToday).toBe(true);
    expect(s.mark).toEqual({ kind: "async", title: "Asynchronous" });
    expect(s.firstClassMin).toBeNull(); // a marked day names no in-person first class
    expect(s.openCount).toBe(2); // the two confirmed tasks
    expect(s.overdueCount).toBe(1); // Jul 7 has passed
    expect(s.nearest).toEqual({ title: "Folk-dance showcase", dueDate: "2026-07-17" });
  });

  it("normal weekday: reports the first class minute, skipping fixtures/breaks", () => {
    const periods = [
      period({ id: 1, start: 420, end: 450, kind: "fixture", subjectId: null, subject: null }),
      period({ id: 2, start: 450, end: 465, kind: "break", subjectId: null, subject: null }),
      period({ id: 3, start: 465, end: 555, kind: "class" }),
    ];
    const s = sectionStatus(periods, null, [task({ dueDate: "2026-07-17" })], wed);

    expect(s.mark).toBeNull();
    expect(s.firstClassMin).toBe(465); // 7:45 — the class, not the 7:00 assembly
  });

  it("split first block: still yields the shared start minute (no subject named at this layer)", () => {
    const periods = [
      period({ id: 1, start: 465, end: 555, strand: "STEM" }),
      period({ id: 2, start: 465, end: 555, strand: "ABM" }),
      period({ id: 3, start: 465, end: 555, strand: "HUMSS" }),
    ];
    const s = sectionStatus(periods, null, [], wed);
    expect(s.firstClassMin).toBe(465);
  });

  it("weekend: rolls forward to the coming Monday and marks it not-today", () => {
    const s = sectionStatus([period({ day: 1, start: 465 })], null, [], sat);
    expect(s.dateISO).toBe("2026-07-13"); // Monday
    expect(s.isSchoolToday).toBe(false);
    expect(s.firstClassMin).toBe(465);
  });

  it("empty database: no schedule, no data, nothing open", () => {
    const s = sectionStatus([], null, [], wed);
    expect(s.hasSchedule).toBe(false);
    expect(s.hasAnyData).toBe(false);
    expect(s.firstClassMin).toBeNull();
    expect(s.openCount).toBe(0);
    expect(s.nearest).toBeNull();
    expect(s.overdueCount).toBe(0);
  });

  it("all requirements cancelled or done: quiet section, not an empty one", () => {
    const tasks = [
      task({ id: 1, dueDate: "2026-07-17", status: "cancelled" }),
      task({ id: 2, dueDate: "2026-07-18", status: "done" }),
      task({ id: 3, dueDate: "2026-07-19", doneInClass: true }),
    ];
    const s = sectionStatus([period({})], null, tasks, wed);
    expect(s.hasAnyData).toBe(true); // periods + tasks exist
    expect(s.openCount).toBe(0);
    expect(s.overdueCount).toBe(0);
    expect(s.nearest).toBeNull();
  });

  it("picks the soonest upcoming task as nearest regardless of input order", () => {
    const tasks = [
      task({ id: 1, title: "Later", dueDate: "2026-07-30" }),
      task({ id: 2, title: "Sooner", dueDate: "2026-07-12" }),
      task({ id: 3, title: "Overdue", dueDate: "2026-07-01" }),
    ];
    const s = sectionStatus([], null, tasks, wed);
    expect(s.nearest).toEqual({ title: "Sooner", dueDate: "2026-07-12" });
    expect(s.overdueCount).toBe(1);
    expect(s.openCount).toBe(3);
  });
});
