import { describe, expect, it } from "vitest";
import {
  addDays,
  daysUntil,
  dueLabel,
  dueTone,
  fromISODate,
  isISODate,
  isPastDue,
  toISODate,
  todayISO,
} from "./time";

describe("addDays", () => {
  it("crosses a month boundary", () => {
    const d = addDays(new Date(2026, 0, 30), 3); // Jan 30 + 3
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(1); // February
    expect(d.getDate()).toBe(2);
  });

  it("crosses a year boundary", () => {
    const d = addDays(new Date(2025, 11, 30), 5); // Dec 30 + 5
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0); // January
    expect(d.getDate()).toBe(4);
  });

  it("handles negative days", () => {
    const d = addDays(new Date(2026, 0, 2), -3);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(11);
    expect(d.getDate()).toBe(30);
  });
});

describe("fromISODate / toISODate round-trip", () => {
  it("round-trips a normal date", () => {
    expect(toISODate(fromISODate("2026-07-16"))).toBe("2026-07-16");
  });

  it("round-trips the first of a month", () => {
    expect(toISODate(fromISODate("2026-01-01"))).toBe("2026-01-01");
  });

  it("round-trips a leap-day date", () => {
    expect(toISODate(fromISODate("2024-02-29"))).toBe("2024-02-29");
  });
});

describe("isISODate", () => {
  it("accepts a valid calendar date", () => {
    expect(isISODate("2026-07-16")).toBe(true);
  });

  it("accepts a valid leap day", () => {
    expect(isISODate("2024-02-29")).toBe(true);
  });

  it("rejects Feb 31 (rolls over in Date, caught by round-trip check)", () => {
    expect(isISODate("2026-02-31")).toBe(false);
  });

  it("rejects month 13", () => {
    expect(isISODate("2026-13-01")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isISODate("")).toBe(false);
  });

  it("rejects a non-leap-year Feb 29", () => {
    expect(isISODate("2026-02-29")).toBe(false);
  });

  it("rejects malformed shapes", () => {
    expect(isISODate("2026-7-16")).toBe(false);
    expect(isISODate("07-16-2026")).toBe(false);
    expect(isISODate("not-a-date")).toBe(false);
  });
});

describe("daysUntil", () => {
  const from = new Date(2026, 6, 10); // Jul 10, 2026

  it("is positive for a future date", () => {
    expect(daysUntil("2026-07-13", from)).toBe(3);
  });

  it("is zero for today", () => {
    expect(daysUntil("2026-07-10", from)).toBe(0);
  });

  it("is negative for a past date", () => {
    expect(daysUntil("2026-07-01", from)).toBe(-9);
  });

  it("ignores the time-of-day component of `from`", () => {
    const withTime = new Date(2026, 6, 10, 23, 59);
    expect(daysUntil("2026-07-11", withTime)).toBe(1);
  });
});

describe("isPastDue", () => {
  it("is true when the due date is in the past", () => {
    const from = new Date(2026, 6, 10, 9, 0);
    expect(isPastDue("2026-07-09", null, from)).toBe(true);
  });

  it("is false for a future date", () => {
    const from = new Date(2026, 6, 10, 9, 0);
    expect(isPastDue("2026-07-11", null, from)).toBe(false);
  });

  it("without dueTime, is false for today (end of day)", () => {
    const from = new Date(2026, 6, 10, 23, 59);
    expect(isPastDue("2026-07-10", null, from)).toBe(false);
  });

  it("with dueTime, is true once that minute has passed today", () => {
    const from = new Date(2026, 6, 10, 15, 0); // 15:00 = 900 min
    expect(isPastDue("2026-07-10", 900, from)).toBe(true);
    expect(isPastDue("2026-07-10", 901, from)).toBe(false);
  });

  it("with dueTime, exact-minute match counts as past due (>=)", () => {
    const from = new Date(2026, 6, 10, 15, 0);
    expect(isPastDue("2026-07-10", 900, from)).toBe(true);
  });
});

describe("dueLabel", () => {
  const from = new Date(2026, 6, 10, 9, 0); // Jul 10, 2026, Fri

  it("labels 1 day overdue as singular", () => {
    expect(dueLabel("2026-07-09", from)).toBe("1d overdue");
  });

  it("labels multi-day overdue as plural count", () => {
    expect(dueLabel("2026-07-05", from)).toBe("5d overdue");
  });

  it("labels today as Today when not past due", () => {
    expect(dueLabel("2026-07-10", from)).toBe("Today");
  });

  it("labels today as Overdue once dueTime passed", () => {
    expect(dueLabel("2026-07-10", from, 480)).toBe("Overdue"); // 8:00 AM already passed
  });

  it("labels tomorrow as Tomorrow", () => {
    expect(dueLabel("2026-07-11", from)).toBe("Tomorrow");
  });

  it("labels within a week as a medium formatted date", () => {
    // 6 days out
    expect(dueLabel("2026-07-16", from)).not.toBe("Tomorrow");
    expect(typeof dueLabel("2026-07-16", from)).toBe("string");
  });

  it("labels beyond a week as a short formatted date", () => {
    const label = dueLabel("2026-08-01", from);
    expect(label).toContain("Aug");
  });
});

describe("dueTone", () => {
  const from = new Date(2026, 6, 10, 9, 0);

  it("is danger when overdue", () => {
    expect(dueTone("2026-07-09", from)).toBe("danger");
  });

  it("is warn for today, not yet past due", () => {
    expect(dueTone("2026-07-10", from)).toBe("warn");
  });

  it("is danger for today once past the dueTime", () => {
    expect(dueTone("2026-07-10", from, 480)).toBe("danger");
  });

  it("is soon within the next 2 days", () => {
    expect(dueTone("2026-07-11", from)).toBe("soon");
    expect(dueTone("2026-07-12", from)).toBe("soon");
  });

  it("is normal beyond 2 days out", () => {
    expect(dueTone("2026-07-13", from)).toBe("normal");
  });
});

describe("todayISO", () => {
  it("returns a YYYY-MM-DD shaped string", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
