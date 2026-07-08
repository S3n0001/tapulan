import { describe, expect, it } from "vitest";
import { classMeetingFor, liveForDay, periodProgress } from "./schedule";
import type { PeriodFull, SubjectFull, Teacher } from "./types";

const teacher: Teacher = { id: 1, name: "Ms. Cruz", note: null };

const subject: SubjectFull = {
  id: 10,
  name: "General Mathematics",
  short: "GenMath",
  teacherId: 1,
  strand: null,
  hue: "blue",
  room: "204",
  teacher,
};

const secondarySubject: SubjectFull = {
  id: 11,
  name: "Research",
  short: "Research",
  teacherId: 1,
  strand: null,
  hue: "green",
  room: "205",
  teacher,
};

function period(overrides: Partial<PeriodFull>): PeriodFull {
  return {
    id: 1,
    day: 1,
    start: 480,
    end: 540,
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

describe("classMeetingFor", () => {
  it("returns the earliest matching period when a subject meets multiple times", () => {
    const periods: PeriodFull[] = [
      period({ id: 1, day: 1, start: 600, end: 660 }),
      period({ id: 2, day: 1, start: 480, end: 540 }), // earlier
      period({ id: 3, day: 2, start: 400, end: 450 }), // wrong day
    ];
    const result = classMeetingFor(
      { subjectId: subject.id, secondarySubjectId: null, dueDate: "2026-07-06" }, // Monday
      periods
    );
    expect(result).toEqual({ start: 480, end: 540, subjectId: subject.id });
  });

  it("returns null when the subject doesn't meet on that weekday (weekend due date)", () => {
    const periods: PeriodFull[] = [period({ id: 1, day: 1 })];
    const result = classMeetingFor(
      { subjectId: subject.id, secondarySubjectId: null, dueDate: "2026-07-11" }, // Saturday
      periods
    );
    expect(result).toBeNull();
  });

  it("returns null when the subject simply has no period that weekday", () => {
    const periods: PeriodFull[] = [period({ id: 1, day: 2 })]; // Tuesday only
    const result = classMeetingFor(
      { subjectId: subject.id, secondarySubjectId: null, dueDate: "2026-07-06" }, // Monday
      periods
    );
    expect(result).toBeNull();
  });

  it("matches on the secondary (collab) subject too", () => {
    const periods: PeriodFull[] = [
      period({ id: 1, day: 1, subjectId: secondarySubject.id, subject: secondarySubject }),
    ];
    const result = classMeetingFor(
      {
        subjectId: subject.id,
        secondarySubjectId: secondarySubject.id,
        dueDate: "2026-07-06",
      },
      periods
    );
    expect(result?.subjectId).toBe(secondarySubject.id);
  });

  it("ignores non-class periods (break/fixture) and periods with no subject", () => {
    const periods: PeriodFull[] = [
      period({ id: 1, day: 1, kind: "break", subjectId: null, subject: null }),
      period({ id: 2, day: 1, kind: "fixture", subjectId: null, subject: null }),
    ];
    const result = classMeetingFor(
      { subjectId: subject.id, secondarySubjectId: null, dueDate: "2026-07-06" },
      periods
    );
    expect(result).toBeNull();
  });
});

describe("liveForDay", () => {
  const dayPeriods: PeriodFull[] = [
    period({ id: 1, start: 480, end: 540 }), // 8:00-9:00
    period({ id: 2, start: 540, end: 600 }), // 9:00-10:00
    period({ id: 3, start: 600, end: 660 }), // 10:00-11:00
  ];

  it("marks periods before now as past, the containing one as current, rest upcoming", () => {
    const result = liveForDay(dayPeriods, 550, true); // 9:10, inside period 2
    expect(result.states.get(1)).toBe("past");
    expect(result.states.get(2)).toBe("current");
    expect(result.states.get(3)).toBe("upcoming");
    expect(result.currentId).toBe(2);
  });

  it("computes nextId and nextClassId as the next period after now", () => {
    const result = liveForDay(dayPeriods, 550, true);
    expect(result.nextId).toBe(3);
    expect(result.nextClassId).toBe(3);
  });

  it("nextClassId skips non-class periods", () => {
    const mixed: PeriodFull[] = [
      period({ id: 1, start: 480, end: 540, kind: "break", subjectId: null, subject: null }),
      period({ id: 2, start: 540, end: 600, kind: "class" }),
      period({ id: 3, start: 600, end: 660, kind: "class" }),
    ];
    const result = liveForDay(mixed, 400, true); // before everything
    expect(result.nextId).toBe(1); // next of any kind — the break
    expect(result.nextClassId).toBe(2); // first actual class
  });

  it("nextClassId is null when no class period remains", () => {
    const mixed: PeriodFull[] = [
      period({ id: 1, start: 480, end: 540, kind: "break", subjectId: null, subject: null }),
    ];
    const result = liveForDay(mixed, 400, true);
    expect(result.nextId).toBe(1);
    expect(result.nextClassId).toBeNull();
  });

  it("when not isToday, everything is upcoming and next* default to the first entries", () => {
    const result = liveForDay(dayPeriods, 0, false);
    expect(result.states.get(1)).toBe("upcoming");
    expect(result.states.get(2)).toBe("upcoming");
    expect(result.states.get(3)).toBe("upcoming");
    expect(result.currentId).toBeNull();
    expect(result.nextId).toBe(1);
    expect(result.nextClassId).toBe(1);
  });

  it("handles an empty day (no periods) gracefully", () => {
    const result = liveForDay([], 500, true);
    expect(result.currentId).toBeNull();
    expect(result.nextId).toBeNull();
    expect(result.nextClassId).toBeNull();
  });
});

describe("periodProgress", () => {
  it("clamps to 0 before the period starts", () => {
    const p = period({ start: 480, end: 540 });
    expect(periodProgress(p, 400)).toBe(0);
  });

  it("clamps to 1 after the period ends", () => {
    const p = period({ start: 480, end: 540 });
    expect(periodProgress(p, 700)).toBe(1);
  });

  it("computes a fractional progress mid-period", () => {
    const p = period({ start: 480, end: 540 }); // 60-minute span
    expect(periodProgress(p, 510)).toBeCloseTo(0.5);
  });

  it("guards against a zero-or-negative span, returning 0", () => {
    const zeroSpan = period({ start: 480, end: 480 });
    expect(periodProgress(zeroSpan, 480)).toBe(0);
    const negativeSpan = period({ start: 540, end: 480 });
    expect(periodProgress(negativeSpan, 500)).toBe(0);
  });
});
