import { describe, expect, it } from "vitest";
import {
  expandRule,
  isoWeekday,
  MAX_OCCURRENCES,
  normalizeRule,
  weekdayShort,
  type RecurrenceRule,
} from "./recurrence";

function baseRule(overrides: Partial<RecurrenceRule>): RecurrenceRule {
  return {
    freq: "daily",
    interval: 1,
    weekdays: [],
    nth: null,
    weekday: null,
    startDate: "2026-07-06", // Monday
    endDate: null,
    count: null,
    ...overrides,
  };
}

describe("isoWeekday", () => {
  it("maps Monday to 1 and Sunday to 7", () => {
    expect(isoWeekday(new Date(2026, 6, 6))).toBe(1); // Mon
    expect(isoWeekday(new Date(2026, 6, 12))).toBe(7); // Sun
  });

  it("maps Saturday to 6", () => {
    expect(isoWeekday(new Date(2026, 6, 11))).toBe(6);
  });
});

describe("weekdayShort", () => {
  it("maps iso weekdays to short names", () => {
    expect(weekdayShort(1)).toBe("Mon");
    expect(weekdayShort(5)).toBe("Fri");
    expect(weekdayShort(7)).toBe("Sun");
  });
});

describe("expandRule: daily", () => {
  it("only emits school days (Mon-Fri), bounded by count", () => {
    // 2026-07-06 is a Monday
    const rule = normalizeRule(baseRule({ freq: "daily", count: 7 }));
    if (typeof rule === "string") throw new Error(rule);
    const dates = expandRule(rule);
    expect(dates).toHaveLength(7);
    // Mon Jul 6 .. should skip the weekend of Jul 11-12
    expect(dates).toEqual([
      "2026-07-06",
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-13",
      "2026-07-14",
    ]);
  });

  it("bounded by endDate instead of count", () => {
    const rule = normalizeRule(
      baseRule({ freq: "daily", count: null, endDate: "2026-07-08" })
    );
    if (typeof rule === "string") throw new Error(rule);
    const dates = expandRule(rule);
    expect(dates).toEqual(["2026-07-06", "2026-07-07", "2026-07-08"]);
  });

  it("starting on a weekend produces no dates before the next school day", () => {
    const rule = normalizeRule(
      baseRule({ freq: "daily", startDate: "2026-07-11", count: 2 }) // Saturday
    );
    if (typeof rule === "string") throw new Error(rule);
    const dates = expandRule(rule);
    expect(dates).toEqual(["2026-07-13", "2026-07-14"]);
  });
});

describe("expandRule: weekly", () => {
  it("emits multiple weekdays per week in order", () => {
    const rule = normalizeRule(
      baseRule({ freq: "weekly", weekdays: [3, 1], count: 4 }) // Mon + Wed
    );
    if (typeof rule === "string") throw new Error(rule);
    const dates = expandRule(rule);
    // startDate is Monday 2026-07-06
    expect(dates).toEqual([
      "2026-07-06", // Mon
      "2026-07-08", // Wed
      "2026-07-13", // Mon
      "2026-07-15", // Wed
    ]);
  });

  it("respects interval > 1 (every N weeks)", () => {
    const rule = normalizeRule(
      baseRule({ freq: "weekly", weekdays: [1], interval: 2, count: 3 })
    );
    if (typeof rule === "string") throw new Error(rule);
    const dates = expandRule(rule);
    expect(dates).toEqual(["2026-07-06", "2026-07-20", "2026-08-03"]);
  });

  it("count bounds the series even with a distant endDate", () => {
    const rule = normalizeRule(
      baseRule({
        freq: "weekly",
        weekdays: [1, 2, 3, 4, 5],
        count: 3,
        endDate: null,
      })
    );
    if (typeof rule === "string") throw new Error(rule);
    const dates = expandRule(rule);
    expect(dates).toHaveLength(3);
    expect(dates).toEqual(["2026-07-06", "2026-07-07", "2026-07-08"]);
  });

  it("endDate bounds the series when no count is given", () => {
    const rule = normalizeRule(
      baseRule({
        freq: "weekly",
        weekdays: [1, 5],
        count: null,
        endDate: "2026-07-10",
      })
    );
    if (typeof rule === "string") throw new Error(rule);
    const dates = expandRule(rule);
    expect(dates).toEqual(["2026-07-06", "2026-07-10"]);
  });
});

describe("expandRule: monthly", () => {
  it("nth=1 finds the first weekday of the month", () => {
    const rule = normalizeRule(
      baseRule({
        freq: "monthly",
        nth: 1,
        weekday: 5, // Friday
        startDate: "2026-07-01",
        count: 1,
      })
    );
    if (typeof rule === "string") throw new Error(rule);
    const dates = expandRule(rule);
    // First Friday of July 2026 is Jul 3
    expect(dates).toEqual(["2026-07-03"]);
  });

  it("nth=-1 finds the last weekday of the month", () => {
    const rule = normalizeRule(
      baseRule({
        freq: "monthly",
        nth: -1,
        weekday: 5, // Friday
        startDate: "2026-07-01",
        count: 1,
      })
    );
    if (typeof rule === "string") throw new Error(rule);
    const dates = expandRule(rule);
    // Last Friday of July 2026 is Jul 31
    expect(dates).toEqual(["2026-07-31"]);
  });

  it("returns no occurrence for a missing 5th weekday in a month", () => {
    // February 2026: does it have a 5th Monday? Feb 2026 has 28 days,
    // starting on a Sunday (2026-02-01). Mondays: 2,9,16,23 -> only 4.
    const rule = normalizeRule(
      baseRule({
        freq: "monthly",
        nth: 5,
        weekday: 1, // Monday
        startDate: "2026-02-01",
        count: 1,
        endDate: null,
      })
    );
    if (typeof rule === "string") throw new Error(rule);
    // Bound by count=1 but no month within a reasonable horizon may ever
    // produce a 5th Monday if we only look at Feb; instead bound via endDate
    // so the generator doesn't run away searching future months.
    const bounded = { ...rule, count: null, endDate: "2026-02-28" };
    const dates = expandRule(bounded);
    expect(dates).toEqual([]);
  });

  it("respects interval > 1 (every N months)", () => {
    const rule = normalizeRule(
      baseRule({
        freq: "monthly",
        nth: 1,
        weekday: 1, // Monday
        interval: 2,
        startDate: "2026-07-01",
        count: 3,
      })
    );
    if (typeof rule === "string") throw new Error(rule);
    const dates = expandRule(rule);
    // First Monday of July 2026 = Jul 6, then skip to September, then November
    expect(dates).toEqual(["2026-07-06", "2026-09-07", "2026-11-02"]);
  });
});

describe("normalizeRule validation", () => {
  it("rejects an empty weekdays list for weekly", () => {
    const result = normalizeRule(
      baseRule({ freq: "weekly", weekdays: [], endDate: "2026-08-01" })
    );
    expect(result).toBe("Pick at least one weekday to repeat on.");
  });

  it("rejects count < 1", () => {
    const result = normalizeRule(baseRule({ freq: "daily", count: 0 }));
    expect(result).toBe("The repeat count has to be at least 1.");
  });

  it("rejects an endDate before startDate", () => {
    const result = normalizeRule(
      baseRule({ freq: "daily", count: null, endDate: "2026-07-01" })
    );
    expect(result).toBe("The repeat ends before it starts.");
  });

  it("rejects an invalid start date", () => {
    const result = normalizeRule(
      baseRule({ freq: "daily", startDate: "2026-13-40", count: 3 })
    );
    expect(result).toBe("The repeat needs a valid start date.");
  });

  it("requires either an endDate or a count", () => {
    const result = normalizeRule(
      baseRule({ freq: "daily", count: null, endDate: null })
    );
    expect(result).toBe("Set an end date or a number of times to repeat.");
  });

  it("requires nth and weekday for monthly", () => {
    const result = normalizeRule(
      baseRule({ freq: "monthly", nth: null, weekday: null, count: 3 })
    );
    expect(result).toBe("Pick which week of the month (1st–5th or last).");
  });

  it("clamps count to MAX_OCCURRENCES", () => {
    const result = normalizeRule(
      baseRule({ freq: "daily", count: MAX_OCCURRENCES + 500 })
    );
    if (typeof result === "string") throw new Error(result);
    expect(result.count).toBe(MAX_OCCURRENCES);
  });

  it("dedupes and sorts weekly weekdays", () => {
    const result = normalizeRule(
      baseRule({ freq: "weekly", weekdays: [5, 1, 1, 3], endDate: "2026-08-01" })
    );
    if (typeof result === "string") throw new Error(result);
    expect(result.weekdays).toEqual([1, 3, 5]);
  });
});

describe("MAX_OCCURRENCES cap", () => {
  it("expandRule never exceeds MAX_OCCURRENCES even with a huge count", () => {
    const rule = normalizeRule(
      baseRule({ freq: "daily", count: 100000 })
    );
    if (typeof rule === "string") throw new Error(rule);
    // normalizeRule already clamps count, but expandRule itself also caps.
    const dates = expandRule({ ...rule, count: 100000 });
    expect(dates.length).toBeLessThanOrEqual(MAX_OCCURRENCES);
  });
});
