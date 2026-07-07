"use server";

import { getDb } from "@/lib/db";
import { DAY_MARK_KINDS } from "@/lib/domain/day-mark";
import { isISODate } from "@/lib/domain/time";
import type { DayMarkKind } from "@/lib/domain/types";
import { fail, guarded, type ActionResult } from "./_shared";

export interface DayMarkInput {
  /** YYYY-MM-DD */
  date: string;
  kind: DayMarkKind;
  label: string | null;
  note: string | null;
}

function normalize(input: DayMarkInput): DayMarkInput | string {
  const date = input.date?.trim();
  if (!date || !isISODate(date)) return "Pick a valid date.";
  if (!DAY_MARK_KINDS.includes(input.kind)) return "Unknown day kind.";
  return {
    date,
    kind: input.kind,
    label: input.label?.trim() ? input.label.trim() : null,
    note: input.note?.trim() ? input.note.trim() : null,
  };
}

/**
 * Create or update a mark. One mark per date, so a save upserts on the date.
 * When editing shifts the date, `prevDate` clears the old key first — all in
 * one transaction so a day can't briefly carry two marks.
 */
export async function saveDayMark(
  prevDate: string | null,
  input: DayMarkInput
): Promise<ActionResult> {
  const clean = normalize(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    const db = getDb();
    db.transaction(() => {
      if (prevDate && prevDate !== clean.date) {
        db.prepare("DELETE FROM day_marks WHERE date = ?").run(prevDate);
      }
      db.prepare(
        `INSERT INTO day_marks (date, kind, label, note)
         VALUES (@date, @kind, @label, @note)
         ON CONFLICT(date) DO UPDATE SET
           kind = excluded.kind, label = excluded.label, note = excluded.note`
      ).run(clean);
    })();
  });
}

export async function deleteDayMark(date: string): Promise<ActionResult> {
  return guarded(() => {
    getDb().prepare("DELETE FROM day_marks WHERE date = ?").run(date);
  });
}
