import type { CalendarBlock } from "./types";
import { DAY_NAMES, DAY_SHORT } from "./time";

/**
 * Pure helpers for individual calendars. Weekdays are JS numbers (0 = Sunday …
 * 6 = Saturday) so weekends are first-class, but the week reads Monday-first
 * everywhere the app shows it. No I/O — safe on both sides of the wire.
 */

/** Weekday order used for display: Mon … Sun. */
export const WEEK_DAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

/** Sort key that places Monday first and Sunday last. */
export function monFirstIndex(day: number): number {
  return (day + 6) % 7;
}

/** "Mon" · "Sun" — short weekday name for a JS weekday number. */
export function dayShort(day: number): string {
  return DAY_SHORT[day] ?? "";
}

/** "Monday" · "Sunday" — full weekday name for a JS weekday number. */
export function dayName(day: number): string {
  return DAY_NAMES[day] ?? "";
}

export interface DayGroup {
  day: number;
  blocks: CalendarBlock[];
}

/**
 * Group a calendar's blocks by weekday, Monday-first, dropping empty days.
 * Each day's blocks come out ordered by start time.
 */
export function blocksByDay(blocks: CalendarBlock[]): DayGroup[] {
  const map = new Map<number, CalendarBlock[]>();
  for (const b of blocks) {
    const list = map.get(b.day) ?? [];
    list.push(b);
    map.set(b.day, list);
  }
  return WEEK_DAYS_MON_FIRST.filter((d) => map.has(d)).map((d) => ({
    day: d,
    blocks: map.get(d)!.slice().sort((a, b) => a.start - b.start),
  }));
}

/** Total scheduled minutes across every block — a calendar's weekly load. */
export function weeklyMinutes(blocks: CalendarBlock[]): number {
  return blocks.reduce((sum, b) => sum + Math.max(0, b.end - b.start), 0);
}
