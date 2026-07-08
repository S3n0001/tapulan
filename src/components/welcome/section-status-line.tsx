import type { SectionStatus } from "@/lib/domain/welcome";
import { DAY_SHORT, fmtDateShort, fmtMin, fromISODate } from "@/lib/domain/time";

/**
 * The landing's one honest "as of today" fact — the section's real present
 * state, stamped at request time (no ticking, no vanity number). Counts and
 * dates carry the mono/tnum data discipline; the sentence stays calm grey, and
 * an overdue tally shows tiny and neutral so it never alarms a first-time reader.
 */
export function SectionStatusLine({ status }: { status: SectionStatus }) {
  if (!status.hasAnyData) {
    return (
      <p className="text-[11.5px] leading-relaxed text-faint">
        Nothing posted yet. The schedule and requirements will show up here once an admin adds
        them.
      </p>
    );
  }

  const { dateISO, isSchoolToday, mark, firstClassMin, openCount, overdueCount, nearest } = status;
  const stamp = `${DAY_SHORT[fromISODate(dateISO).getDay()]} · ${fmtDateShort(dateISO)}`;

  const dayContext =
    mark?.kind === "async"
      ? "asynchronous, no in-person class"
      : mark?.kind === "no_class"
        ? "no class scheduled"
        : firstClassMin !== null
          ? `first class at ${fmtMin(firstClassMin)}`
          : "no classes listed";

  return (
    <p className="text-[11.5px] leading-relaxed text-faint">
      <span className="text-muted">{isSchoolToday ? "As of " : "Next class day · "}</span>
      <time dateTime={dateISO} className="tnum font-mono text-muted">
        {stamp}
      </time>
      {": "}
      {dayContext}.{" "}
      {openCount > 0 ? (
        <>
          <span className="tnum font-mono text-muted">{openCount}</span>{" "}
          {openCount === 1 ? "requirement" : "requirements"} open
          {nearest && (
            <>
              , the nearest is <span className="text-muted">{nearest.title}</span>{" "}
              <span className="tnum font-mono">({fmtDateShort(nearest.dueDate)})</span>
            </>
          )}
        </>
      ) : (
        "Nothing due right now. Enjoy it while it lasts."
      )}
      {overdueCount > 0 && (
        <>
          {" · "}
          <span className="text-danger-text">
            <span className="tnum font-mono">{overdueCount}</span> overdue
          </span>
        </>
      )}
    </p>
  );
}
