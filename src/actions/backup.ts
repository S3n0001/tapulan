"use server";

import { getDb } from "@/lib/db";
import { seedDatabase } from "@/lib/db/seed";
import { exportAll } from "@/lib/queries";
import { isAdmin } from "@/lib/auth";
import { fail, ok, guarded, type ActionResult } from "./_shared";

/** Serialized full snapshot for the download button (admin only). */
export async function getBackup(): Promise<ActionResult<string>> {
  if (!(await isAdmin())) return fail("Your admin session expired. Sign in again.");
  return ok(JSON.stringify(exportAll(), null, 2));
}

/** Wipe every content table (leaves meta: password, secret, settings). */
function clearContent(db = getDb()): void {
  db.exec(`
    DELETE FROM task_links;
    DELETE FROM tasks;
    DELETE FROM task_types;
    DELETE FROM periods;
    DELETE FROM subjects;
    DELETE FROM teachers;
    DELETE FROM strands;
    DELETE FROM sqlite_sequence WHERE name IN ('task_links','tasks','task_types','periods','subjects','teachers');
  `);
}

/** Restore the printed-program seed. Destructive — the UI double-confirms. */
export async function resetToSeed(): Promise<ActionResult> {
  return guarded(() => {
    const db = getDb();
    db.transaction(() => {
      clearContent(db);
      seedDatabase(db);
    })();
  });
}

interface Backup {
  strands?: unknown[];
  teachers?: unknown[];
  subjects?: unknown[];
  periods?: unknown[];
  taskTypes?: unknown[];
  tasks?: unknown[];
  taskLinks?: unknown[];
}

/** Replace all content from a JSON backup produced by the export button. */
export async function importBackup(json: string): Promise<ActionResult> {
  let data: Backup;
  try {
    data = JSON.parse(json) as Backup;
  } catch {
    return fail("That file isn't valid JSON.");
  }
  if (
    !data ||
    !Array.isArray(data.strands) ||
    !Array.isArray(data.subjects) ||
    !Array.isArray(data.tasks)
  ) {
    return fail("This doesn't look like a Tapulan backup.");
  }

  return guarded(() => {
    const db = getDb();
    const rows = <T>(v: unknown[] | undefined): T[] => (Array.isArray(v) ? (v as T[]) : []);

    db.transaction(() => {
      clearContent(db);

      const insertStrand = db.prepare(
        "INSERT INTO strands (code, name, tagline, hue) VALUES (@code, @name, @tagline, @hue)"
      );
      for (const s of rows<Record<string, unknown>>(data.strands)) {
        insertStrand.run({
          code: String(s.code),
          name: String(s.name ?? ""),
          tagline: String(s.tagline ?? ""),
          hue: String(s.hue ?? "slate"),
        });
      }

      const insertTeacher = db.prepare(
        "INSERT INTO teachers (id, name, note) VALUES (@id, @name, @note)"
      );
      for (const t of rows<Record<string, unknown>>(data.teachers)) {
        insertTeacher.run({
          id: Number(t.id),
          name: String(t.name ?? ""),
          note: t.note != null ? String(t.note) : null,
        });
      }

      const insertSubject = db.prepare(
        `INSERT INTO subjects (id, name, short, teacher_id, strand, hue, room)
         VALUES (@id, @name, @short, @teacher_id, @strand, @hue, @room)`
      );
      for (const s of rows<Record<string, unknown>>(data.subjects)) {
        insertSubject.run({
          id: Number(s.id),
          name: String(s.name ?? ""),
          short: String(s.short ?? ""),
          teacher_id: s.teacher_id != null ? Number(s.teacher_id) : null,
          strand: s.strand != null ? String(s.strand) : null,
          hue: String(s.hue ?? "slate"),
          room: s.room != null ? String(s.room) : null,
        });
      }

      const insertType = db.prepare(
        "INSERT INTO task_types (id, name, short, hue, sort) VALUES (@id, @name, @short, @hue, @sort)"
      );
      for (const t of rows<Record<string, unknown>>(data.taskTypes)) {
        insertType.run({
          id: Number(t.id),
          name: String(t.name ?? ""),
          short: String(t.short ?? ""),
          hue: String(t.hue ?? "slate"),
          sort: Number(t.sort ?? 0),
        });
      }

      const insertPeriod = db.prepare(
        `INSERT INTO periods (id, day, start_min, end_min, kind, label, subject_id, teacher_id, strand)
         VALUES (@id, @day, @start_min, @end_min, @kind, @label, @subject_id, @teacher_id, @strand)`
      );
      for (const pr of rows<Record<string, unknown>>(data.periods)) {
        insertPeriod.run({
          id: Number(pr.id),
          day: Number(pr.day),
          start_min: Number(pr.start_min),
          end_min: Number(pr.end_min),
          kind: String(pr.kind ?? "class"),
          label: pr.label != null ? String(pr.label) : null,
          subject_id: pr.subject_id != null ? Number(pr.subject_id) : null,
          teacher_id: pr.teacher_id != null ? Number(pr.teacher_id) : null,
          strand: pr.strand != null ? String(pr.strand) : null,
        });
      }

      const insertTask = db.prepare(
        `INSERT INTO tasks (id, title, details, subject_id, type_id, due_date, due_time, status, moved_from, note, points, created_at, updated_at)
         VALUES (@id, @title, @details, @subject_id, @type_id, @due_date, @due_time, @status, @moved_from, @note, @points, @created_at, @updated_at)`
      );
      const now = new Date().toISOString();
      for (const tk of rows<Record<string, unknown>>(data.tasks)) {
        insertTask.run({
          id: Number(tk.id),
          title: String(tk.title ?? ""),
          details: String(tk.details ?? ""),
          subject_id: Number(tk.subject_id),
          type_id: Number(tk.type_id),
          due_date: String(tk.due_date),
          due_time: tk.due_time != null ? Number(tk.due_time) : null,
          status: String(tk.status ?? "confirmed"),
          moved_from: tk.moved_from != null ? String(tk.moved_from) : null,
          note: tk.note != null ? String(tk.note) : null,
          points: tk.points != null ? Number(tk.points) : null,
          created_at: String(tk.created_at ?? now),
          updated_at: String(tk.updated_at ?? now),
        });
      }

      const insertLink = db.prepare(
        `INSERT INTO task_links (id, task_id, label, url, kind, sort)
         VALUES (@id, @task_id, @label, @url, @kind, @sort)`
      );
      for (const li of rows<Record<string, unknown>>(data.taskLinks)) {
        insertLink.run({
          id: Number(li.id),
          task_id: Number(li.task_id),
          label: String(li.label ?? ""),
          url: String(li.url ?? ""),
          kind: li.kind === "file" ? "file" : "link",
          sort: Number(li.sort ?? 0),
        });
      }
    })();
  });
}
