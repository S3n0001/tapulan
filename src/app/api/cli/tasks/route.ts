import { getSubjects, getTaskTypes, getTasks } from "@/lib/queries";
import { insertTask, normalizeTaskInput, type TaskInput } from "@/lib/mutations/tasks";
import { inputToMin } from "@/lib/domain/time";
import { jsonErr, jsonOk, refreshViews, requireToken } from "@/lib/api/cli";

/**
 * CLI task list + create. Subjects and types resolve by id or short code
 * (case-insensitive) so `tapulan add -s cpar -t quiz` reads naturally;
 * dates arrive as YYYY-MM-DD — the CLI owns natural-language parsing.
 */

function light(t: ReturnType<typeof getTasks>[number]) {
  return {
    id: t.id,
    title: t.title,
    type: t.type.short,
    subject: t.subject.short,
    collab: t.secondarySubject?.short ?? null,
    due: t.dueDate,
    time: t.dueTime,
    status: t.status,
    heldInClass: t.heldInClass,
    points: t.points,
    movedFrom: t.movedFrom,
    cancelReason: t.cancelReason,
    note: t.note,
  };
}

export async function GET(req: Request) {
  const auth = requireToken(req);
  if (auth instanceof Response) return auth;

  const all = new URL(req.url).searchParams.get("all") === "1";
  const tasks = getTasks().filter(
    (t) => all || t.status === "confirmed" || t.status === "tentative"
  );
  return jsonOk({ tasks: tasks.map(light) });
}

interface CreateBody {
  title?: unknown;
  subject?: unknown; // id or short code
  collab?: unknown; // optional second class — id or short code
  type?: unknown; // id, short code, or name
  due?: unknown; // YYYY-MM-DD
  time?: unknown; // "HH:MM"
  details?: unknown;
  note?: unknown;
  points?: unknown;
  tentative?: unknown;
  doneInClass?: unknown; // finished during class, section-wide
  heldInClass?: unknown; // sat during class (UT/quiz) — time from the schedule
  links?: unknown; // [{ label?, url }]
}

export async function POST(req: Request) {
  const auth = requireToken(req);
  if (auth instanceof Response) return auth;

  const body = (await req.json().catch(() => null)) as CreateBody | null;
  if (!body) return jsonErr("Send a JSON body.");

  const subjects = getSubjects();
  const subjectKey = String(body.subject ?? "").trim();
  const subject = subjects.find(
    (s) => String(s.id) === subjectKey || s.short.toLowerCase() === subjectKey.toLowerCase()
  );
  if (!subject) {
    return jsonErr(
      `Unknown subject "${subjectKey}". One of: ${subjects.map((s) => s.short).join(", ")}.`
    );
  }

  // optional collab class — resolved the same way as `subject`
  const collabKey = String(body.collab ?? "").trim();
  let secondarySubjectId: number | null = null;
  if (collabKey) {
    const collab = subjects.find(
      (s) => String(s.id) === collabKey || s.short.toLowerCase() === collabKey.toLowerCase()
    );
    if (!collab) {
      return jsonErr(
        `Unknown collab class "${collabKey}". One of: ${subjects.map((s) => s.short).join(", ")}.`
      );
    }
    secondarySubjectId = collab.id;
  }

  const types = getTaskTypes();
  const typeKey = String(body.type ?? "").trim();
  const type = types.find(
    (t) =>
      String(t.id) === typeKey ||
      t.short.toLowerCase() === typeKey.toLowerCase() ||
      t.name.toLowerCase() === typeKey.toLowerCase()
  );
  if (!type) {
    return jsonErr(
      `Unknown type "${typeKey}". One of: ${types.map((t) => t.short.toLowerCase()).join(", ")}.`
    );
  }

  const rawLinks = Array.isArray(body.links) ? body.links : [];
  const input: TaskInput = {
    title: typeof body.title === "string" ? body.title : "",
    details: typeof body.details === "string" ? body.details : "",
    subjectId: subject.id,
    secondarySubjectId,
    typeId: type.id,
    dueDate: typeof body.due === "string" ? body.due : "",
    dueTime: typeof body.time === "string" && body.time ? inputToMin(body.time) : null,
    status: body.tentative === true ? "tentative" : "confirmed",
    doneInClass: body.doneInClass === true,
    heldInClass: body.heldInClass === true,
    movedFrom: null,
    cancelReason: null,
    note: typeof body.note === "string" && body.note.trim() ? body.note : null,
    points:
      typeof body.points === "number" && Number.isFinite(body.points) ? body.points : null,
    links: rawLinks.map((l: { label?: unknown; url?: unknown }) => ({
      label: typeof l?.label === "string" ? l.label : "",
      url: typeof l?.url === "string" ? l.url : "",
      kind: "link" as const,
    })),
  };

  const clean = normalizeTaskInput(input);
  if (typeof clean === "string") return jsonErr(clean);

  const { id } = insertTask(clean);
  refreshViews();
  return jsonOk({
    id,
    title: clean.title,
    subject: subject.short,
    type: type.short,
    due: clean.dueDate,
    status: clean.status,
    heldInClass: clean.heldInClass,
  });
}
