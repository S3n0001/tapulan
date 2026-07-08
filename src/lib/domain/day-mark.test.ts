import { describe, expect, it } from "vitest";
import {
  DAY_MARK_BLURB,
  DAY_MARK_HUE,
  DAY_MARK_KINDS,
  DAY_MARK_NAME,
  DAY_MARK_SHORT,
  dayMarkTitle,
} from "./day-mark";
import type { DayMark } from "./types";

describe("day-mark vocabulary tables", () => {
  it("covers both kinds in every table", () => {
    for (const kind of DAY_MARK_KINDS) {
      expect(DAY_MARK_NAME[kind]).toBeTruthy();
      expect(DAY_MARK_SHORT[kind]).toBeTruthy();
      expect(DAY_MARK_BLURB[kind]).toBeTruthy();
      expect(DAY_MARK_HUE[kind]).toBeTruthy();
    }
  });

  it("names async and no_class as expected", () => {
    expect(DAY_MARK_NAME.async).toBe("Asynchronous");
    expect(DAY_MARK_NAME.no_class).toBe("No class");
  });

  it("assigns distinct hues per kind", () => {
    expect(DAY_MARK_HUE.async).toBe("indigo");
    expect(DAY_MARK_HUE.no_class).toBe("slate");
  });
});

describe("dayMarkTitle", () => {
  it("uses the custom label when present", () => {
    const mark: DayMark = {
      date: "2026-07-16",
      kind: "async",
      label: "Foundation Day",
      note: null,
    };
    expect(dayMarkTitle(mark)).toBe("Foundation Day");
  });

  it("falls back to the kind's default name when label is null", () => {
    const mark: DayMark = { date: "2026-07-16", kind: "no_class", label: null, note: null };
    expect(dayMarkTitle(mark)).toBe("No class");
  });

  it("falls back to the kind's default name when label is blank/whitespace", () => {
    const mark: DayMark = { date: "2026-07-16", kind: "async", label: "   ", note: null };
    expect(dayMarkTitle(mark)).toBe("Asynchronous");
  });

  it("trims a custom label", () => {
    const mark: DayMark = {
      date: "2026-07-16",
      kind: "async",
      label: "  Storm suspension  ",
      note: null,
    };
    expect(dayMarkTitle(mark)).toBe("Storm suspension");
  });
});
