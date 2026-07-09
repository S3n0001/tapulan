import { describe, expect, it } from "vitest";
import {
  blocksByDay,
  dayName,
  dayShort,
  monFirstIndex,
  weeklyMinutes,
} from "./calendar";
import { fmtTimeRange } from "./time";
import type { CalendarBlock } from "./types";

function block(partial: Partial<CalendarBlock> & { day: number; start: number; end: number }): CalendarBlock {
  return {
    id: partial.id ?? Math.floor(partial.day * 1440 + partial.start),
    calendarId: partial.calendarId ?? 1,
    label: partial.label ?? "Block",
    note: partial.note ?? null,
    ...partial,
  };
}

describe("monFirstIndex", () => {
  it("orders Monday first and Sunday last", () => {
    // JS weekday: 0 = Sun … 6 = Sat
    expect(monFirstIndex(1)).toBe(0); // Mon
    expect(monFirstIndex(2)).toBe(1); // Tue
    expect(monFirstIndex(5)).toBe(4); // Fri
    expect(monFirstIndex(6)).toBe(5); // Sat
    expect(monFirstIndex(0)).toBe(6); // Sun
  });
});

describe("dayShort / dayName", () => {
  it("names weekdays by JS weekday number", () => {
    expect(dayShort(1)).toBe("Mon");
    expect(dayShort(0)).toBe("Sun");
    expect(dayName(6)).toBe("Saturday");
  });
});

describe("blocksByDay", () => {
  it("groups Monday-first and drops empty days", () => {
    const groups = blocksByDay([
      block({ day: 0, start: 600, end: 660 }), // Sun
      block({ day: 1, start: 540, end: 1020 }), // Mon
      block({ day: 3, start: 480, end: 540 }), // Wed
    ]);
    expect(groups.map((g) => g.day)).toEqual([1, 3, 0]); // Mon, Wed, Sun
  });

  it("orders a day's blocks by start time", () => {
    const groups = blocksByDay([
      block({ day: 1, start: 780, end: 840, label: "Afternoon" }),
      block({ day: 1, start: 540, end: 600, label: "Morning" }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].blocks.map((b) => b.label)).toEqual(["Morning", "Afternoon"]);
  });

  it("returns nothing for no blocks", () => {
    expect(blocksByDay([])).toEqual([]);
  });
});

describe("weeklyMinutes", () => {
  it("sums every block's duration", () => {
    expect(
      weeklyMinutes([
        block({ day: 1, start: 540, end: 1020 }), // 8h = 480m
        block({ day: 2, start: 600, end: 720 }), // 2h = 120m
      ])
    ).toBe(600);
  });

  it("ignores a non-positive span", () => {
    expect(weeklyMinutes([block({ day: 1, start: 600, end: 600 })])).toBe(0);
  });
});

describe("fmtTimeRange", () => {
  it("keeps one meridiem when both ends share it", () => {
    expect(fmtTimeRange(540, 660)).toBe("9:00–11:00 AM"); // 9:00–11:00
    expect(fmtTimeRange(780, 900)).toBe("1:00–3:00 PM"); // 13:00–15:00
  });

  it("shows both meridiems across noon", () => {
    expect(fmtTimeRange(540, 1020)).toBe("9:00 AM – 5:00 PM"); // 9:00–17:00
  });

  it("treats noon as PM", () => {
    expect(fmtTimeRange(660, 720)).toBe("11:00 AM – 12:00 PM"); // 11:00–12:00
  });
});
