"use server";

import { getDb } from "@/lib/db";
import { isISODate } from "@/lib/domain/time";
import { TASK_STATUSES, type TaskStatus } from "@/lib/domain/types";
import { fail, guarded, type ActionResult } from "./_shared";

export interface TaskLinkInput {
  label: string;
  url: string;
  kind: "link" | "file";
}

export interface TaskInput {
  title: string;
  details: string;
  subjectId: number;
  typeId: number;
  dueDate: string;
  dueTime: number | null;
  status: TaskStatus;
  movedFrom: string | null;
  note: string | null;
  points: number | null;
  /** materials — replaces the task's full link list on save */
  links: TaskLinkInput[];
}

/** Accept http(s) URLs and this app's own uploaded-file paths. */
function cleanUrl(raw: string): string | null {
  const url = raw.trim();
  if (url.startsWith("/api/files/")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch {
    // fall through — try prefixing a scheme for pasted "drive.google.com/…"
    try {
      const parsed = new URL(`https://${url}`);
      if (parsed.hostname.includes(".")) return parsed.href;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeLinks(links: TaskLinkInput[]): TaskLinkInput[] | string {
  const clean: TaskLinkInput[] = [];
  for (const link of Array.isArray(links) ? links : []) {
    const url = cleanUrl(link.url ?? "");
    if (!url) return "One of the material links isn't a valid URL.";
    const label = (link.label ?? "").trim();
    clean.push({
      label: label || urlLabel(url),
      url,
      kind: link.kind === "file" ? "file" : "link",
    });
  }
  return clean;
}

/** Fallback label for an unlabelled URL: its host, or the file's name. */
function urlLabel(url: string): string {
  if (url.startsWith("/api/files/")) {
    const name = url.split("/").pop() ?? "File";
    return decodeURIComponent(name);
  }
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

function replaceLinks(taskId: number, links: TaskLinkInput[]): void {
  const db = getDb();
  db.prepare("DELETE FROM task_links WHERE task_id = ?").run(taskId);
  const insert = db.prepare(
    "INSERT INTO task_links (task_id, label, url, kind, sort) VALUES (?, ?, ?, ?, ?)"
  );
  links.forEach((link, i) => insert.run(taskId, link.label, link.url, link.kind, i));
}

function normalize(input: TaskInput): TaskInput | string {
  const title = input.title.trim();
  if (!title) return "Give the task a title.";
  if (!Number.isInteger(input.subjectId)) return "Pick a subject.";
  if (!Number.isInteger(input.typeId)) return "Pick a type.";
  if (!isISODate(input.dueDate)) return "Pick a valid due date.";
  if (!TASK_STATUSES.includes(input.status)) return "Unknown status.";
  if (input.movedFrom !== null && !isISODate(input.movedFrom)) return "The original date looks off.";
  const dueTime =
    input.dueTime === null || (Number.isInteger(input.dueTime) && input.dueTime >= 0 && input.dueTime < 1440)
      ? input.dueTime
      : null;
  const points =
    input.points === null || (Number.isFinite(input.points) && input.points >= 0)
      ? input.points
      : null;
  const links = normalizeLinks(input.links);
  if (typeof links === "string") return links;
  return {
    title,
    details: input.details.trim(),
    subjectId: input.subjectId,
    typeId: input.typeId,
    dueDate: input.dueDate,
    dueTime,
    status: input.status,
    movedFrom: input.movedFrom,
    note: input.note?.trim() ? input.note.trim() : null,
    points,
    links,
  };
}

export async function createTask(input: TaskInput): Promise<ActionResult<{ id: number }>> {
  const clean = normalize(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    const db = getDb();
    const now = new Date().toISOString();
    const { links, ...task } = clean;
    return db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO tasks (title, details, subject_id, type_id, due_date, due_time, status, moved_from, note, points, created_at, updated_at)
           VALUES (@title, @details, @subjectId, @typeId, @dueDate, @dueTime, @status, @movedFrom, @note, @points, @now, @now)`
        )
        .run({ ...task, now });
      const id = Number(info.lastInsertRowid);
      replaceLinks(id, links);
      return { id };
    })();
  });
}

export async function updateTask(id: number, input: TaskInput): Promise<ActionResult> {
  const clean = normalize(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => {
    const db = getDb();
    const { links, ...task } = clean;
    db.transaction(() => {
      db.prepare(
        `UPDATE tasks SET
           title=@title, details=@details, subject_id=@subjectId, type_id=@typeId,
           due_date=@dueDate, due_time=@dueTime, status=@status, moved_from=@movedFrom,
           note=@note, points=@points, updated_at=@now
         WHERE id=@id`
      ).run({ ...task, id, now: new Date().toISOString() });
      replaceLinks(id, links);
    })();
  });
}

/**
 * Reschedule a task and record the move: the current date becomes
 * `moved_from` so the UI can show "Jul 10 → Jul 14". Tentative until the
 * teacher confirms (the common "pwede po ba i-move?" case).
 */
export async function moveTask(
  id: number,
  toDate: string,
  opts: { tentative: boolean; note: string | null }
): Promise<ActionResult> {
  if (!isISODate(toDate)) return fail("Pick a valid new date.");
  return guarded(() => {
    const db = getDb();
    const row = db.prepare("SELECT due_date, moved_from FROM tasks WHERE id = ?").get(id) as
      | { due_date: string; moved_from: string | null }
      | undefined;
    if (!row) throw new Error("That task no longer exists.");
    // Preserve the earliest known original date across repeated moves.
    const movedFrom = row.moved_from ?? row.due_date;
    db.prepare(
      `UPDATE tasks SET due_date=@toDate, moved_from=@movedFrom,
         status=@status, note=@note, updated_at=@now WHERE id=@id`
    ).run({
      id,
      toDate,
      movedFrom: movedFrom === toDate ? null : movedFrom,
      status: opts.tentative ? "tentative" : "confirmed",
      note: opts.note?.trim() ? opts.note.trim() : null,
      now: new Date().toISOString(),
    });
  });
}

export async function setTaskStatus(id: number, status: TaskStatus): Promise<ActionResult> {
  if (!TASK_STATUSES.includes(status)) return fail("Unknown status.");
  return guarded(() => {
    getDb()
      .prepare("UPDATE tasks SET status=?, updated_at=? WHERE id=?")
      .run(status, new Date().toISOString(), id);
  });
}

/** Confirm a tentative/moved task in one tap. */
export async function confirmTask(id: number): Promise<ActionResult> {
  return setTaskStatus(id, "confirmed");
}

export async function deleteTask(id: number): Promise<ActionResult> {
  return guarded(() => {
    getDb().prepare("DELETE FROM tasks WHERE id = ?").run(id);
  });
}
