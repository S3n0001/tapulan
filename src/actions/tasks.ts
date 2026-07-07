"use server";

import {
  deleteTaskRow,
  deleteTaskSeriesRow,
  insertTask,
  insertTaskSeries,
  moveTaskRow,
  normalizeTaskInput,
  setTaskDoneInClassRow,
  setTaskStatusRow,
  updateTaskRow,
  type TaskInput,
} from "@/lib/mutations/tasks";
import { getTaskSeries } from "@/lib/queries";
import { isISODate, toISODate } from "@/lib/domain/time";
import type { RecurrenceRule } from "@/lib/domain/recurrence";
import { TASK_STATUSES, type TaskStatus } from "@/lib/domain/types";
import { fail, guarded, ok, type ActionResult } from "./_shared";

/**
 * Admin-guarded task mutations for the web UI. The actual write logic
 * lives in `lib/mutations/tasks` and is shared with the CLI API routes.
 */

export type { TaskInput, TaskLinkInput } from "@/lib/mutations/tasks";

export async function createTask(input: TaskInput): Promise<ActionResult<{ id: number }>> {
  const clean = normalizeTaskInput(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => insertTask(clean));
}

export async function updateTask(id: number, input: TaskInput): Promise<ActionResult> {
  const clean = normalizeTaskInput(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => updateTaskRow(id, clean));
}

/**
 * Create a repeating task: materialize every occurrence of `rule` as its own
 * task row, all sharing the base task's subject/type/details. Each occurrence
 * can later be moved, cancelled, or marked done on its own.
 */
export async function createTaskSeries(
  input: TaskInput,
  rule: RecurrenceRule
): Promise<ActionResult<{ seriesId: number; count: number }>> {
  const clean = normalizeTaskInput(input);
  if (typeof clean === "string") return fail(clean);
  return guarded(() => insertTaskSeries(clean, rule));
}

/** Delete a series — its upcoming open occurrences go; past/done ones stay. */
export async function deleteTaskSeries(id: number): Promise<ActionResult<{ deleted: number }>> {
  return guarded(() => deleteTaskSeriesRow(id, toISODate(new Date())));
}

/** Describe a series for the task panel (rule + occurrence counts). */
export async function describeTaskSeries(id: number) {
  return ok(getTaskSeries(id, toISODate(new Date())));
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
  return guarded(() => moveTaskRow(id, toDate, opts));
}

export async function setTaskStatus(
  id: number,
  status: TaskStatus,
  reason: string | null = null
): Promise<ActionResult> {
  if (!TASK_STATUSES.includes(status)) return fail("Unknown status.");
  return guarded(() => setTaskStatusRow(id, status, reason));
}

/** Call a task off, with an optional reason shown to the section. */
export async function cancelTask(id: number, reason: string | null): Promise<ActionResult> {
  return setTaskStatus(id, "cancelled", reason);
}

/** Confirm a tentative/moved task — or restore a cancelled one — in one tap. */
export async function confirmTask(id: number): Promise<ActionResult> {
  return setTaskStatus(id, "confirmed");
}

/** Mark (or unmark) a task as finished during class — section-wide. */
export async function setTaskDoneInClass(id: number, value: boolean): Promise<ActionResult> {
  return guarded(() => setTaskDoneInClassRow(id, value));
}

export async function deleteTask(id: number): Promise<ActionResult> {
  return guarded(() => deleteTaskRow(id));
}
