import { deleteTaskRow, moveTaskRow, setTaskStatusRow } from "@/lib/mutations/tasks";
import { isISODate } from "@/lib/domain/time";
import { TASK_STATUSES, type TaskStatus } from "@/lib/domain/types";
import { getTasks } from "@/lib/queries";
import { jsonErr, jsonOk, refreshViews, requireToken } from "@/lib/api/cli";

/**
 * CLI mutations on one task: move (records the honest old → new history),
 * status flips (done / cancel / confirm), and delete.
 */

type Params = { params: Promise<{ id: string }> };

function findTask(id: number) {
  return getTasks().find((t) => t.id === id) ?? null;
}

interface PatchBody {
  move?: { to?: unknown; tentative?: unknown; note?: unknown };
  status?: unknown;
  /** optional cancellation reason, honored when status is "cancelled" */
  reason?: unknown;
}

export async function PATCH(req: Request, { params }: Params) {
  const auth = requireToken(req);
  if (auth instanceof Response) return auth;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return jsonErr("Bad task id.");
  if (!findTask(id)) return jsonErr("That task no longer exists.", 404);

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body) return jsonErr("Send a JSON body.");

  try {
    if (body.move) {
      const to = typeof body.move.to === "string" ? body.move.to : "";
      if (!isISODate(to)) return jsonErr("Pick a valid new date (YYYY-MM-DD).");
      moveTaskRow(id, to, {
        // moved dates default to tentative — the honest state until confirmed
        tentative: body.move.tentative !== false,
        note: typeof body.move.note === "string" ? body.move.note : null,
      });
    } else if (body.status !== undefined) {
      const status = String(body.status) as TaskStatus;
      if (!TASK_STATUSES.includes(status)) return jsonErr("Unknown status.");
      setTaskStatusRow(id, status, typeof body.reason === "string" ? body.reason : null);
    } else {
      return jsonErr("Nothing to do — send `move` or `status`.");
    }
  } catch (err) {
    return jsonErr(err instanceof Error ? err.message : "Something went wrong.");
  }

  refreshViews();
  const t = findTask(id)!;
  return jsonOk({
    id,
    title: t.title,
    due: t.dueDate,
    status: t.status,
    movedFrom: t.movedFrom,
    cancelReason: t.cancelReason,
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = requireToken(req);
  if (auth instanceof Response) return auth;

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return jsonErr("Bad task id.");
  const task = findTask(id);
  if (!task) return jsonErr("That task no longer exists.", 404);

  deleteTaskRow(id);
  refreshViews();
  return jsonOk({ id, title: task.title });
}
