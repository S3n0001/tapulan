"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import type { PeriodFull, Strand, SubjectFull, Teacher } from "@/lib/domain/types";
import { DAY_NAMES, fmtDuration, fmtMin } from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { PeriodEditor } from "./period-editor";

/** The full weekly grid as an editable list, grouped by day. */
export function ScheduleTab({
  periods,
  subjects,
  teachers,
  strands,
}: {
  periods: PeriodFull[];
  subjects: SubjectFull[];
  teachers: Teacher[];
  strands: Strand[];
}) {
  const [editing, setEditing] = useState<PeriodFull | "new" | null>(null);
  const [newDay, setNewDay] = useState(1);

  const byDay = useMemo(() => {
    const map = new Map<number, PeriodFull[]>();
    for (const p of periods) {
      const list = map.get(p.day) ?? [];
      list.push(p);
      map.set(p.day, list);
    }
    return map;
  }, [periods]);

  return (
    <div>
      <div className="flex h-11 items-center gap-2 border-b border-line px-3.5 lg:px-4">
        <span className="tnum font-mono text-[12px] text-faint">
          {periods.length} periods · Mon–Fri
        </span>
        <Button
          size="sm"
          variant="primary"
          className="ml-auto"
          onClick={() => {
            setNewDay(1);
            setEditing("new");
          }}
        >
          <Plus className="size-3.5" />
          New period
        </Button>
      </div>

      {periods.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="The week is empty"
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setNewDay(1);
                setEditing("new");
              }}
            >
              <Plus className="size-3.5" />
              New period
            </Button>
          }
        >
          Add the first period — breaks and fixtures count too, so the timeline reads like the
          printed program.
        </EmptyState>
      ) : (
        [1, 2, 3, 4, 5].map((day) => {
          const list = byDay.get(day) ?? [];
          return (
            <section key={day}>
              <div className="sticky top-0 z-10 flex h-7 items-center gap-2 border-b border-line/70 bg-[color-mix(in_oklab,var(--surface)_45%,var(--bg))] px-3.5 backdrop-blur lg:px-4">
                <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted">
                  {DAY_NAMES[day]}
                </h3>
                <span className="tnum font-mono text-[10.5px] text-faint">{list.length}</span>
                <button
                  type="button"
                  onClick={() => {
                    setNewDay(day);
                    setEditing("new");
                  }}
                  className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-faint transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <Plus className="size-3" />
                  Add
                </button>
              </div>
              <ul className="divide-y divide-line/60">
                {list.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors duration-[var(--dur-1)] hover:bg-surface/70 lg:px-4"
                    >
                      <span className="tnum w-[86px] shrink-0 font-mono text-[12px] text-muted">
                        {fmtMin(p.start)}–{fmtMin(p.end)}
                      </span>
                      {p.kind === "class" && p.subject ? (
                        <>
                          <span
                            style={accentStyle(p.subject.hue)}
                            className="a-dot size-2 shrink-0 rounded-full"
                          />
                          <span className="w-[70px] shrink-0 truncate font-mono text-[11.5px] font-semibold text-muted">
                            {p.subject.short}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                            {p.subject.name}
                          </span>
                          <span className="hidden w-[140px] shrink-0 truncate text-[12px] text-muted sm:block">
                            {p.teacher?.name ?? "—"}
                            {p.teacherId !== null && (
                              <span className="ml-1 text-[10px] text-warn-text">override</span>
                            )}
                          </span>
                        </>
                      ) : (
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-[12.5px] font-medium",
                            p.kind === "break" ? "text-faint" : "text-muted"
                          )}
                        >
                          {p.label}
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.05em] text-faint/80">
                            {p.kind}
                          </span>
                        </span>
                      )}
                      {p.strand && (
                        <span className="shrink-0 rounded-[4px] bg-surface-2 px-1 font-mono text-[10px] font-semibold text-muted">
                          {p.strand}
                        </span>
                      )}
                      <span className="tnum hidden w-[52px] shrink-0 text-right font-mono text-[11px] text-faint sm:block">
                        {fmtDuration(p.end - p.start)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      {editing !== null && (
        <PeriodEditor
          period={editing === "new" ? null : editing}
          defaultDay={newDay}
          subjects={subjects}
          teachers={teachers}
          strands={strands}
          open
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
