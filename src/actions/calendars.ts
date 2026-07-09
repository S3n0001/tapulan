"use server";

import { getDb } from "@/lib/db";
import { isHue } from "@/lib/domain/hues";
import { fail, guarded, type ActionResult } from "./_shared";

/**
 * Individual-calendar writes — all admin-only (the guard verifies the session).
 * A calendar is a person's/purpose's weekly schedule; its blocks are recurring
 * time slots. Mirrors the periods/day-mark action shape: normalize, then run.
 */

export interface CalendarInput {
  name: string;
  subtitle: string | null;
  hue: string;
  published: boolean;
}

export interface CalendarBlockInput {
  calendarId: number;
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** minutes from midnight */
  start: number;
  end: number;
  label: string;
  note: string | null;
}

function normalizeCalendar(input: CalendarInput): CalendarInput | string {
  const name = input.name?.trim();
  if (!name) return "Give the calendar a name.";
  return {
    name,
    subtitle: input.subtitle?.trim() ? input.subtitle.trim() : null,
    hue: isHue(input.hue) ? input.hue : "slate",
    published: !!input.published,
  };
}

function normalizeBlock(input: CalendarBlockInput): CalendarBlockInput | string {
  if (!Number.isInteger(input.calendarId)) return "Pick a calendar.";
  if (!Number.isInteger(input.day) || input.day < 0 || input.day > 6)
    return "Pick a day of the week.";
  if (!Number.isInteger(input.start) || !Number.isInteger(input.end))
    return "Start and end times are required.";
  if (input.start < 0 || input.end > 1440) return "Times must fall within a day.";
  if (input.end <= input.start) return "End time must be after the start time.";
  const label = input.label?.trim();
  if (!label) return "Give the block a label (e.g. Work, Math).";
  return {
    calendarId: input.calendarId,
    day: input.day,
    start: input.start,
    end: input.end,
    label,
    note: input.note?.trim() ? input.note.trim() : null,
  };
}

// ------------------------------------------------------------- calendars

export async function createCalendar(
  input: CalendarInput
): Promise<ActionResult<{ id: number }>> {
  const clean = normalizeCalendar(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    const db = getDb();
    // new calendars sort to the end of the list
    const next = (
      db.prepare("SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM calendars").get() as { n: number }
    ).n;
    const info = db
      .prepare(
        `INSERT INTO calendars (name, subtitle, hue, published, sort, created_at)
         VALUES (@name, @subtitle, @hue, @published, @sort, @createdAt)`
      )
      .run({
        name: clean.name,
        subtitle: clean.subtitle,
        hue: clean.hue,
        published: clean.published ? 1 : 0,
        sort: next,
        createdAt: new Date().toISOString(),
      });
    return { id: Number(info.lastInsertRowid) };
  });
}

export async function updateCalendar(
  id: number,
  input: CalendarInput
): Promise<ActionResult> {
  const clean = normalizeCalendar(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    const info = getDb()
      .prepare(
        `UPDATE calendars SET name=@name, subtitle=@subtitle, hue=@hue, published=@published
         WHERE id=@id`
      )
      .run({
        id,
        name: clean.name,
        subtitle: clean.subtitle,
        hue: clean.hue,
        published: clean.published ? 1 : 0,
      });
    if (info.changes === 0) throw new Error("That calendar no longer exists.");
  });
}

export async function deleteCalendar(id: number): Promise<ActionResult> {
  return guarded(() => {
    // calendar_blocks cascade with the calendar (FK ON DELETE CASCADE)
    getDb().prepare("DELETE FROM calendars WHERE id = ?").run(id);
  });
}

// --------------------------------------------------------------- blocks

export async function createCalendarBlock(
  input: CalendarBlockInput
): Promise<ActionResult<{ id: number }>> {
  const clean = normalizeBlock(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    const db = getDb();
    const exists = db.prepare("SELECT 1 FROM calendars WHERE id = ?").get(clean.calendarId);
    if (!exists) throw new Error("That calendar no longer exists.");
    const info = db
      .prepare(
        `INSERT INTO calendar_blocks (calendar_id, day, start_min, end_min, label, note)
         VALUES (@calendarId, @day, @start, @end, @label, @note)`
      )
      .run(clean);
    return { id: Number(info.lastInsertRowid) };
  });
}

export async function updateCalendarBlock(
  id: number,
  input: CalendarBlockInput
): Promise<ActionResult> {
  const clean = normalizeBlock(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    const info = getDb()
      .prepare(
        `UPDATE calendar_blocks SET day=@day, start_min=@start, end_min=@end, label=@label, note=@note
         WHERE id=@id`
      )
      .run({ ...clean, id });
    if (info.changes === 0) throw new Error("That block no longer exists.");
  });
}

export async function deleteCalendarBlock(id: number): Promise<ActionResult> {
  return guarded(() => {
    getDb().prepare("DELETE FROM calendar_blocks WHERE id = ?").run(id);
  });
}
