"use server";

import fs from "node:fs";
import path from "node:path";
import { getDb } from "@/lib/db";
import { seedDatabase } from "@/lib/db/seed";
import { exportAll } from "@/lib/queries";
import { isAdmin } from "@/lib/auth";
import { isISODate } from "@/lib/domain/time";
import { cleanUrl } from "@/lib/mutations/tasks";
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
    DELETE FROM task_series;
    DELETE FROM task_types;
    DELETE FROM day_marks;
    DELETE FROM periods;
    DELETE FROM subjects;
    DELETE FROM teachers;
    DELETE FROM strands;
    DELETE FROM sqlite_sequence WHERE name IN ('task_links','tasks','task_series','task_types','periods','subjects','teachers');
  `);
}

/**
 * Snapshot the live DB to disk before a destructive restore/reset, so a bad
 * import or an accidental reset can be recovered from. Uses SQLite's own
 * VACUUM INTO — a consistent, single-file copy taken in one statement.
 */
function snapshotBeforeDestroy(db = getDb()): void {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  const backupsDir = path.join(dir, "backups");
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(backupsDir, `tapulan-${stamp}.db`);
  db.prepare("VACUUM INTO ?").run(file);
}

/** Restore the printed-program seed. Destructive — the UI double-confirms. */
export async function resetToSeed(): Promise<ActionResult> {
  return guarded(() => {
    const db = getDb();
    snapshotBeforeDestroy(db);
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
  dayMarks?: unknown[];
  taskTypes?: unknown[];
  taskSeries?: unknown[];
  tasks?: unknown[];
  taskLinks?: unknown[];
}

const DAY_MARK_KINDS = new Set(["async", "no_class"]);

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

    snapshotBeforeDestroy(db);

    try {
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

        // Calendar overrides — skip rows with an invalid kind rather than
        // aborting the whole restore over one bad row.
        const insertDayMark = db.prepare(
          "INSERT INTO day_marks (date, kind, label, note) VALUES (@date, @kind, @label, @note)"
        );
        for (const dm of rows<Record<string, unknown>>(data.dayMarks)) {
          const date = String(dm.date ?? "");
          const kind = String(dm.kind ?? "");
          if (!isISODate(date) || !DAY_MARK_KINDS.has(kind)) continue;
          insertDayMark.run({
            date,
            kind,
            label: dm.label != null ? String(dm.label) : null,
            note: dm.note != null ? String(dm.note) : null,
          });
        }

        const insertSeries = db.prepare(
          `INSERT INTO task_series (id, title, freq, interval, weekdays, nth, weekday, start_date, end_date, count, created_at)
           VALUES (@id, @title, @freq, @interval, @weekdays, @nth, @weekday, @start_date, @end_date, @count, @created_at)`
        );
        const seriesNow = new Date().toISOString();
        for (const sr of rows<Record<string, unknown>>(data.taskSeries)) {
          insertSeries.run({
            id: Number(sr.id),
            title: String(sr.title ?? ""),
            freq: sr.freq === "daily" || sr.freq === "monthly" ? String(sr.freq) : "weekly",
            interval: Number(sr.interval ?? 1) || 1,
            weekdays: sr.weekdays != null ? String(sr.weekdays) : null,
            nth: sr.nth != null ? Number(sr.nth) : null,
            weekday: sr.weekday != null ? Number(sr.weekday) : null,
            start_date: String(sr.start_date),
            end_date: sr.end_date != null ? String(sr.end_date) : null,
            count: sr.count != null ? Number(sr.count) : null,
            created_at: String(sr.created_at ?? seriesNow),
          });
        }

        const insertTask = db.prepare(
          `INSERT INTO tasks (id, title, details, subject_id, secondary_subject_id, series_id, type_id, due_date, due_time, status, done_in_class, held_in_class, moved_from, cancel_reason, note, points, created_at, updated_at)
           VALUES (@id, @title, @details, @subject_id, @secondary_subject_id, @series_id, @type_id, @due_date, @due_time, @status, @done_in_class, @held_in_class, @moved_from, @cancel_reason, @note, @points, @created_at, @updated_at)`
        );
        const now = new Date().toISOString();
        let skippedTasks = 0;
        for (const tk of rows<Record<string, unknown>>(data.tasks)) {
          const due_date = String(tk.due_date ?? "");
          if (!isISODate(due_date)) {
            skippedTasks++;
            continue;
          }
          const rawDueTime = tk.due_time != null ? Number(tk.due_time) : null;
          const due_time =
            rawDueTime != null && Number.isFinite(rawDueTime)
              ? Math.min(Math.max(Math.trunc(rawDueTime), 0), 1439)
              : null;
          insertTask.run({
            id: Number(tk.id),
            title: String(tk.title ?? ""),
            details: String(tk.details ?? ""),
            subject_id: Number(tk.subject_id),
            secondary_subject_id:
              tk.secondary_subject_id != null ? Number(tk.secondary_subject_id) : null,
            series_id: tk.series_id != null ? Number(tk.series_id) : null,
            type_id: Number(tk.type_id),
            due_date,
            due_time,
            status: String(tk.status ?? "confirmed"),
            done_in_class: tk.done_in_class ? 1 : 0,
            held_in_class: tk.held_in_class ? 1 : 0,
            moved_from: tk.moved_from != null ? String(tk.moved_from) : null,
            cancel_reason: tk.cancel_reason != null ? String(tk.cancel_reason) : null,
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
        let skippedLinks = 0;
        for (const li of rows<Record<string, unknown>>(data.taskLinks)) {
          const url = cleanUrl(String(li.url ?? ""));
          if (!url) {
            skippedLinks++;
            continue;
          }
          insertLink.run({
            id: Number(li.id),
            task_id: Number(li.task_id),
            label: String(li.label ?? ""),
            url,
            kind: li.kind === "file" ? "file" : "link",
            sort: Number(li.sort ?? 0),
          });
        }

        if (skippedTasks || skippedLinks) {
          console.error(
            JSON.stringify({
              level: "warn",
              action: "import-backup",
              message: "Skipped invalid rows during restore.",
              skippedTasks,
              skippedLinks,
            })
          );
        }
      })();
    } catch (err) {
      // SQLite reports FK violations tersely — translate to something the
      // admin can act on instead of a raw "FOREIGN KEY constraint failed".
      const raw = err instanceof Error ? err.message : String(err);
      if (/FOREIGN KEY constraint failed/i.test(raw)) {
        throw new Error(
          "Restore failed: the backup references a subject, teacher, type, or series that isn't in the file (referential integrity). A safety snapshot of your previous data was saved before the attempt, so nothing was lost."
        );
      }
      throw err instanceof Error ? err : new Error(raw);
    }
  });
}
