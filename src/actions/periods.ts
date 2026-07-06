"use server";

import { getDb } from "@/lib/db";
import { parseStrand } from "@/lib/domain/strand";
import type { PeriodKind } from "@/lib/domain/types";
import { fail, guarded, type ActionResult } from "./_shared";

const KINDS: PeriodKind[] = ["class", "break", "fixture"];

export interface PeriodInput {
  day: number;
  start: number;
  end: number;
  kind: PeriodKind;
  label: string | null;
  subjectId: number | null;
  teacherId: number | null;
  strand: string | null;
}

function normalize(input: PeriodInput): PeriodInput | string {
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > 5)
    return "Day must be Monday–Friday.";
  if (!Number.isInteger(input.start) || !Number.isInteger(input.end))
    return "Start and end times are required.";
  if (input.end <= input.start) return "End time must be after the start time.";
  if (!KINDS.includes(input.kind)) return "Unknown period kind.";
  if (input.kind === "class" && !Number.isInteger(input.subjectId))
    return "A class period needs a subject.";
  const label = input.label?.trim() ? input.label.trim() : null;
  if (input.kind !== "class" && !label)
    return "Give the break/fixture a label (e.g. Lunch Break).";
  return {
    day: input.day,
    start: input.start,
    end: input.end,
    kind: input.kind,
    label,
    subjectId: input.kind === "class" ? input.subjectId : null,
    teacherId: Number.isInteger(input.teacherId) ? input.teacherId : null,
    strand: parseStrand(input.strand),
  };
}

export async function createPeriod(input: PeriodInput): Promise<ActionResult<{ id: number }>> {
  const clean = normalize(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    const info = getDb()
      .prepare(
        `INSERT INTO periods (day, start_min, end_min, kind, label, subject_id, teacher_id, strand)
         VALUES (@day, @start, @end, @kind, @label, @subjectId, @teacherId, @strand)`
      )
      .run(clean);
    return { id: Number(info.lastInsertRowid) };
  });
}

export async function updatePeriod(id: number, input: PeriodInput): Promise<ActionResult> {
  const clean = normalize(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    getDb()
      .prepare(
        `UPDATE periods SET day=@day, start_min=@start, end_min=@end, kind=@kind,
           label=@label, subject_id=@subjectId, teacher_id=@teacherId, strand=@strand
         WHERE id=@id`
      )
      .run({ ...clean, id });
  });
}

export async function deletePeriod(id: number): Promise<ActionResult> {
  return guarded(() => {
    getDb().prepare("DELETE FROM periods WHERE id = ?").run(id);
  });
}
