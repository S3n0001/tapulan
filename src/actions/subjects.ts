"use server";

import { getDb } from "@/lib/db";
import { isHue } from "@/lib/domain/hues";
import { parseStrand } from "@/lib/domain/strand";
import { fail, guarded, type ActionResult } from "./_shared";

export interface SubjectInput {
  name: string;
  short: string;
  teacherId: number | null;
  strand: string | null;
  hue: string;
  room: string | null;
}

function normalize(input: SubjectInput): SubjectInput | string {
  const name = input.name.trim();
  const short = input.short.trim().toUpperCase();
  if (!name) return "Subject name is required.";
  if (!short) return "Add a short code (e.g. PHYSICS).";
  if (!isHue(input.hue)) return "Pick a color.";
  return {
    name,
    short,
    teacherId: Number.isInteger(input.teacherId) ? input.teacherId : null,
    strand: parseStrand(input.strand),
    hue: input.hue,
    room: input.room?.trim() ? input.room.trim() : null,
  };
}

export async function createSubject(input: SubjectInput): Promise<ActionResult<{ id: number }>> {
  const clean = normalize(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    const info = getDb()
      .prepare(
        `INSERT INTO subjects (name, short, teacher_id, strand, hue, room)
         VALUES (@name, @short, @teacherId, @strand, @hue, @room)`
      )
      .run(clean);
    return { id: Number(info.lastInsertRowid) };
  });
}

export async function updateSubject(id: number, input: SubjectInput): Promise<ActionResult> {
  const clean = normalize(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    getDb()
      .prepare(
        `UPDATE subjects SET name=@name, short=@short, teacher_id=@teacherId,
           strand=@strand, hue=@hue, room=@room WHERE id=@id`
      )
      .run({ ...clean, id });
  });
}

/** Cascades to this subject's periods and tasks (see schema FKs). */
export async function deleteSubject(id: number): Promise<ActionResult> {
  return guarded(() => {
    getDb().prepare("DELETE FROM subjects WHERE id = ?").run(id);
  });
}
