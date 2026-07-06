"use server";

import { getDb } from "@/lib/db";
import { fail, guarded, type ActionResult } from "./_shared";

export interface TeacherInput {
  name: string;
  note: string | null;
}

function normalize(input: TeacherInput): TeacherInput | string {
  const name = input.name.trim();
  if (!name) return "Teacher name is required.";
  return { name, note: input.note?.trim() ? input.note.trim() : null };
}

export async function createTeacher(input: TeacherInput): Promise<ActionResult<{ id: number }>> {
  const clean = normalize(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    const info = getDb()
      .prepare("INSERT INTO teachers (name, note) VALUES (@name, @note)")
      .run(clean);
    return { id: Number(info.lastInsertRowid) };
  });
}

export async function updateTeacher(id: number, input: TeacherInput): Promise<ActionResult> {
  const clean = normalize(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    getDb().prepare("UPDATE teachers SET name=@name, note=@note WHERE id=@id").run({ ...clean, id });
  });
}

/** Teacher references null out on subjects/periods (schema ON DELETE SET NULL). */
export async function deleteTeacher(id: number): Promise<ActionResult> {
  return guarded(() => {
    getDb().prepare("DELETE FROM teachers WHERE id = ?").run(id);
  });
}
