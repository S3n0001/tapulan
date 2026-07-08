import { getTasks } from "@/lib/queries";
import { parseStrand } from "@/lib/domain/strand";
import { addDays, fromISODate, toISODate } from "@/lib/domain/time";

/**
 * Read-only iCalendar feed of due requirements, so deadlines live in the
 * student's own calendar app (Google/Apple) with a day-before reminder —
 * the highest-reliability nudge, no push infrastructure needed.
 *
 *   /api/ics?strand=STEM   →  subscribe via webcal:// or import as .ics
 */
export const runtime = "nodejs";

function esc(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");
}

/** YYYYMMDD for an all-day VALUE=DATE. */
function dateOnly(iso: string): string {
  return iso.replace(/-/g, "");
}

/** Floating local YYYYMMDDTHHMMSS (the section lives in one timezone). */
function dateTime(iso: string, min: number): string {
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return `${dateOnly(iso)}T${hh}${mm}00`;
}

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const strand = parseStrand(searchParams.get("strand") ?? undefined);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tapulan//Requirements//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Tapulan${strand ? ` · ${strand}` : ""}`,
  ];

  for (const t of getTasks(strand)) {
    if (t.status === "cancelled") continue;

    // A held-in-class task spans its class meeting (or an explicit override);
    // a normal one is a point at its due time, else an all-day entry.
    const meeting = t.heldInClass ? t.classMeeting : null;
    const startMin = t.heldInClass ? (t.dueTime ?? meeting?.start ?? null) : t.dueTime;
    const endMin = t.heldInClass ? (t.dueTime ?? meeting?.end ?? startMin) : t.dueTime;

    lines.push("BEGIN:VEVENT", `UID:task-${t.id}@tapulan`, `DTSTAMP:${stamp}`);
    if (startMin !== null) {
      lines.push(
        `DTSTART:${dateTime(t.dueDate, startMin)}`,
        `DTEND:${dateTime(t.dueDate, endMin ?? startMin)}`
      );
    } else {
      lines.push(
        `DTSTART;VALUE=DATE:${dateOnly(t.dueDate)}`,
        `DTEND;VALUE=DATE:${dateOnly(toISODate(addDays(fromISODate(t.dueDate), 1)))}`
      );
    }

    let summary = `${t.type.short}: ${t.title}`;
    if (t.status === "tentative") summary += " (unconfirmed)";
    lines.push(`SUMMARY:${esc(summary)}`);

    const desc: string[] = [
      t.secondarySubject
        ? `Subjects: ${t.subject.name} × ${t.secondarySubject.name}`
        : `Subject: ${t.subject.name}`,
    ];
    if (t.heldInClass) desc.push("Sat in class");
    if (t.points !== null) desc.push(`${t.points} pts`);
    if (t.movedFrom) desc.push(`Moved from ${t.movedFrom}`);
    if (t.details.trim()) desc.push(t.details.trim());
    if (t.note?.trim()) desc.push(`Note: ${t.note.trim()}`);
    lines.push(`DESCRIPTION:${esc(desc.join("\n"))}`);

    // remind the evening before
    lines.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Due tomorrow", "TRIGGER:-P1D", "END:VALARM");
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="tapulan.ics"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
