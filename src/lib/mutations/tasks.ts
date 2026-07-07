import "server-only";
import { getDb } from "@/lib/db";
import { isISODate } from "@/lib/domain/time";
import { expandRule, normalizeRule, type RecurrenceRule } from "@/lib/domain/recurrence";
import { TASK_STATUSES, type TaskStatus } from "@/lib/domain/types";

/**
 * The one write path for tasks. Server actions (admin cookie) and the CLI
 * API routes (bearer token) both funnel through these — same validation,
 * same honest move-history rules, no drift between the two doors.
 */

export interface TaskLinkInput {
  label: string;
  url: string;
  kind: "link" | "file";
}

export interface TaskInput {
  title: string;
  details: string;
  subjectId: number;
  /** optional collab class — a second subject the task also belongs to */
  secondarySubjectId: number | null;
  typeId: number;
  dueDate: string;
  dueTime: number | null;
  status: TaskStatus;
  /** section-wide "finished during class" marker (admin-set) */
  doneInClass: boolean;
  movedFrom: string | null;
  /** why it was called off — only kept when status is "cancelled" */
  cancelReason: string | null;
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

/** Validate + trim a TaskInput. Returns the clean input, or a user-facing error. */
export function normalizeTaskInput(input: TaskInput): TaskInput | string {
  const title = input.title.trim();
  if (!title) return "Give the task a title.";
  if (!Number.isInteger(input.subjectId)) return "Pick a subject.";
  // a collab class is optional; when set it must be a real, different subject
  const secondarySubjectId =
    input.secondarySubjectId !== null && Number.isInteger(input.secondarySubjectId)
      ? input.secondarySubjectId
      : null;
  if (secondarySubjectId !== null && secondarySubjectId === input.subjectId)
    return "The collab class has to be a different subject.";
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
  // a reason only makes sense on a cancelled task — drop it otherwise so the
  // data can't disagree with the status
  const cancelReason =
    input.status === "cancelled" && input.cancelReason?.trim() ? input.cancelReason.trim() : null;
  return {
    title,
    details: input.details.trim(),
    subjectId: input.subjectId,
    secondarySubjectId,
    typeId: input.typeId,
    dueDate: input.dueDate,
    dueTime,
    status: input.status,
    doneInClass: !!input.doneInClass,
    movedFrom: input.movedFrom,
    cancelReason,
    note: input.note?.trim() ? input.note.trim() : null,
    points,
    links,
  };
}

/** Insert a normalized task (with its links) and return the new id. */
export function insertTask(clean: TaskInput): { id: number } {
  const db = getDb();
  const now = new Date().toISOString();
  const { links, ...task } = clean;
  return db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO tasks (title, details, subject_id, secondary_subject_id, type_id, due_date, due_time, status, done_in_class, moved_from, cancel_reason, note, points, created_at, updated_at)
         VALUES (@title, @details, @subjectId, @secondarySubjectId, @typeId, @dueDate, @dueTime, @status, @doneInClass, @movedFrom, @cancelReason, @note, @points, @now, @now)`
      )
      .run({ ...task, doneInClass: task.doneInClass ? 1 : 0, now });
    const id = Number(info.lastInsertRowid);
    replaceLinks(id, links);
    return { id };
  })();
}

/** Overwrite a task (and its full link list) with a normalized input. */
export function updateTaskRow(id: number, clean: TaskInput): void {
  const db = getDb();
  const { links, ...task } = clean;
  db.transaction(() => {
    db.prepare(
      `UPDATE tasks SET
         title=@title, details=@details, subject_id=@subjectId,
         secondary_subject_id=@secondarySubjectId, type_id=@typeId,
         due_date=@dueDate, due_time=@dueTime, status=@status, done_in_class=@doneInClass,
         moved_from=@movedFrom, cancel_reason=@cancelReason, note=@note, points=@points, updated_at=@now
       WHERE id=@id`
    ).run({ ...task, id, doneInClass: task.doneInClass ? 1 : 0, now: new Date().toISOString() });
    replaceLinks(id, links);
  })();
}

/**
 * Reschedule and record the move: the current date becomes `moved_from` so
 * the UI can show "Jul 10 → Jul 14". The earliest known original date is
 * preserved across repeated moves; tentative until the teacher confirms.
 */
export function moveTaskRow(
  id: number,
  toDate: string,
  opts: { tentative: boolean; note: string | null }
): void {
  const db = getDb();
  const row = db.prepare("SELECT due_date, moved_from FROM tasks WHERE id = ?").get(id) as
    | { due_date: string; moved_from: string | null }
    | undefined;
  if (!row) throw new Error("That task no longer exists.");
  const movedFrom = row.moved_from ?? row.due_date;
  db.prepare(
    // a move re-activates the task, so any old cancellation reason is cleared
    `UPDATE tasks SET due_date=@toDate, moved_from=@movedFrom,
       status=@status, cancel_reason=NULL, note=@note, updated_at=@now WHERE id=@id`
  ).run({
    id,
    toDate,
    movedFrom: movedFrom === toDate ? null : movedFrom,
    status: opts.tentative ? "tentative" : "confirmed",
    note: opts.note?.trim() ? opts.note.trim() : null,
    now: new Date().toISOString(),
  });
}

/**
 * Flip a task's status. A `reason` is only stored when cancelling; every other
 * status (confirm / restore / done) clears it, so a live task never carries a
 * stale cancellation note.
 */
export function setTaskStatusRow(id: number, status: TaskStatus, reason: string | null = null): void {
  const cancelReason = status === "cancelled" && reason?.trim() ? reason.trim() : null;
  const info = getDb()
    .prepare("UPDATE tasks SET status=?, cancel_reason=?, updated_at=? WHERE id=?")
    .run(status, cancelReason, new Date().toISOString(), id);
  if (info.changes === 0) throw new Error("That task no longer exists.");
}

/** Toggle the section-wide "done in class" marker on one task. */
export function setTaskDoneInClassRow(id: number, value: boolean): void {
  const info = getDb()
    .prepare("UPDATE tasks SET done_in_class = ?, updated_at = ? WHERE id = ?")
    .run(value ? 1 : 0, new Date().toISOString(), id);
  if (info.changes === 0) throw new Error("That task no longer exists.");
}

export function deleteTaskRow(id: number): void {
  getDb().prepare("DELETE FROM tasks WHERE id = ?").run(id);
}

// ------------------------------------------------------------- recurring

/**
 * Create a repeating series: persist the pattern, then materialize every
 * occurrence as its own task row (sharing the base's subject/type/links, each
 * with its own due date). The base input's `dueDate` is the series start.
 * Returns the new series id and how many occurrences were created.
 */
export function insertTaskSeries(
  base: TaskInput,
  rawRule: RecurrenceRule
): { seriesId: number; count: number } {
  // the series always starts on the base task's due date — keep them in lockstep
  const rule = normalizeRule({ ...rawRule, startDate: base.dueDate });
  if (typeof rule === "string") throw new Error(rule);
  const dates = expandRule(rule);
  if (dates.length === 0) throw new Error("That repeat pattern produces no dates.");

  const db = getDb();
  const now = new Date().toISOString();
  const { links } = base;

  return db.transaction(() => {
    const seriesInfo = db
      .prepare(
        `INSERT INTO task_series (title, freq, interval, weekdays, nth, weekday, start_date, end_date, count, created_at)
         VALUES (@title, @freq, @interval, @weekdays, @nth, @weekday, @startDate, @endDate, @count, @now)`
      )
      .run({
        title: base.title,
        freq: rule.freq,
        interval: rule.interval,
        weekdays: rule.weekdays.length ? rule.weekdays.join(",") : null,
        nth: rule.nth,
        weekday: rule.weekday,
        startDate: rule.startDate,
        endDate: rule.endDate,
        count: rule.count,
        now,
      });
    const seriesId = Number(seriesInfo.lastInsertRowid);

    const insert = db.prepare(
      `INSERT INTO tasks (title, details, subject_id, secondary_subject_id, series_id, type_id, due_date, due_time, status, moved_from, cancel_reason, note, points, created_at, updated_at)
       VALUES (@title, @details, @subjectId, @secondarySubjectId, @seriesId, @typeId, @dueDate, @dueTime, @status, NULL, NULL, @note, @points, @now, @now)`
    );
    for (const dueDate of dates) {
      const info = insert.run({
        title: base.title,
        details: base.details,
        subjectId: base.subjectId,
        secondarySubjectId: base.secondarySubjectId,
        seriesId,
        typeId: base.typeId,
        dueDate,
        dueTime: base.dueTime,
        status: base.status,
        note: base.note,
        points: base.points,
        now,
      });
      if (links.length) replaceLinks(Number(info.lastInsertRowid), links);
    }
    return { seriesId, count: dates.length };
  })();
}

/**
 * Delete a series. Upcoming, still-open occurrences are removed with it;
 * past or already-done ones are kept (their `series_id` cleared) so graded
 * history survives. Returns how many occurrences were deleted.
 */
export function deleteTaskSeriesRow(id: number, todayISO: string): { deleted: number } {
  const db = getDb();
  return db.transaction(() => {
    const info = db
      .prepare(
        `DELETE FROM tasks
         WHERE series_id = ? AND due_date >= ? AND status IN ('confirmed','tentative')`
      )
      .run(id, todayISO);
    db.prepare("UPDATE tasks SET series_id = NULL WHERE series_id = ?").run(id);
    db.prepare("DELETE FROM task_series WHERE id = ?").run(id);
    return { deleted: info.changes };
  })();
}
