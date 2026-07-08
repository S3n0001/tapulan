"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Library } from "lucide-react";
import {
  taskSubjectIds,
  type PeriodFull,
  type Strand,
  type SubjectFull,
  type TaskFull,
  type Teacher,
} from "@/lib/domain/types";
import { accentStyle } from "@/lib/domain/hues";
import { cn } from "@/lib/utils";
import { useRetained } from "@/hooks/use-retained";
import { ViewChrome } from "@/components/shell/view-chrome";
import { EmptyState } from "@/components/ui/empty";
import { useIsAdmin } from "@/components/shell/admin-context";
import { SubjectEditor } from "@/components/admin/subject-editor";
import { ClassPanel } from "./class-panel";

const DAY_LETTERS = ["M", "T", "W", "T", "F"];

export function ClassesView({
  subjects,
  periods,
  tasks,
  teachers,
  strands,
  nowISO,
}: {
  subjects: SubjectFull[];
  periods: PeriodFull[];
  tasks: TaskFull[];
  teachers: Teacher[];
  strands: Strand[];
  nowISO: string;
}) {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<SubjectFull | null>(null);
  // retained through the close so the editor's exit animation plays intact
  const shownEditing = useRetained(editing);

  const selectedId = Number(searchParams.get("c")) || null;
  const select = useCallback(
    (id: number | null) => {
      router.replace(id === null ? pathname : `${pathname}?c=${id}`, { scroll: false });
    },
    [router, pathname]
  );

  const meetingsBySubject = useMemo(() => {
    const map = new Map<number, PeriodFull[]>();
    for (const p of periods) {
      if (p.subjectId === null) continue;
      const list = map.get(p.subjectId) ?? [];
      list.push(p);
      map.set(p.subjectId, list);
    }
    return map;
  }, [periods]);

  const openCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of tasks) {
      if (t.status === "done" || t.status === "cancelled" || t.doneInClass) continue;
      // a collab requirement counts toward both of its classes
      for (const id of taskSubjectIds(t)) map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  }, [tasks]);

  const groups = useMemo(() => {
    const core = subjects.filter((s) => s.strand === null);
    const result: { key: string; title: string; hint: string; list: SubjectFull[] }[] = [];
    if (core.length > 0) {
      result.push({ key: "core", title: "Core", hint: "every strand", list: core });
    }
    for (const strand of strands) {
      const majors = subjects.filter((s) => s.strand === strand.code);
      if (majors.length > 0) {
        result.push({
          key: strand.code,
          title: strand.code,
          hint: "majors",
          list: majors,
        });
      }
    }
    return result;
  }, [subjects, strands]);

  const selected = selectedId !== null ? (subjects.find((s) => s.id === selectedId) ?? null) : null;

  return (
    <ViewChrome
      title="Classes"
      icon={Library}
      crumbs={
        selected
          ? [{ label: "Classes", onClick: () => select(null) }, { label: selected.name }]
          : undefined
      }
      meta={<span className="tnum">{subjects.length} subjects</span>}
    >

      {subjects.length === 0 ? (
        <EmptyState fill icon={Library} title="No subjects yet">
          Subjects appear here once an admin adds them under Admin → Subjects.
        </EmptyState>
      ) : (
        <>
          {groups.map((group) => (
            <section key={group.key}>
            <div className="sticky top-[calc(3rem+env(safe-area-inset-top)+2.75rem)] z-10 flex h-7 items-center gap-2 border-b border-line/70 bg-[color-mix(in_oklab,var(--surface)_45%,var(--bg))] px-3.5 backdrop-blur lg:top-0 lg:px-4">
              <h3 className="text-[11px] font-medium text-muted">{group.title}</h3>
              <span className="text-[11px] text-faint">{group.hint}</span>
              <span className="tnum ml-auto font-mono text-[10.5px] text-faint">
                {group.list.length}
              </span>
            </div>
            <ul className="divide-y divide-line/60">
              {group.list.map((s) => {
                const meetings = meetingsBySubject.get(s.id) ?? [];
                const meetDays = new Set(meetings.map((m) => m.day));
                const open = openCounts.get(s.id) ?? 0;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => select(s.id)}
                      className={cn(
                        "relative flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-[var(--dur-1)] focus-visible:bg-surface-2 focus-visible:outline-none lg:h-11 lg:px-4 lg:py-0",
                        s.id === selectedId ? "bg-surface-2" : "hover:bg-surface/70"
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-0 inset-y-0 w-[2px] bg-brand transition-opacity duration-[var(--dur-1)]",
                          s.id === selectedId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span
                        style={accentStyle(s.hue)}
                        className="a-dot size-2.5 shrink-0 rounded-[3.5px]"
                        aria-hidden
                      />
                      <span className="w-[70px] shrink-0 truncate font-mono text-[11.5px] font-semibold text-muted">
                        {s.short}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium leading-snug text-ink">
                          {s.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-muted md:hidden">
                          {[s.teacher?.name, s.room].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                      <span className="hidden w-[150px] shrink-0 truncate text-[12px] text-muted md:block">
                        {s.teacher?.name ?? "—"}
                      </span>
                      <span className="tnum hidden w-[56px] shrink-0 truncate font-mono text-[11px] text-faint sm:block">
                        {s.room ?? ""}
                      </span>
                      <span className="hidden shrink-0 gap-[3px] lg:flex" aria-hidden>
                        {DAY_LETTERS.map((letter, i) => (
                          <span
                            key={i}
                            className={cn(
                              "grid size-[17px] place-items-center rounded-[4px] font-mono text-[9.5px] font-semibold",
                              meetDays.has(i + 1)
                                ? "bg-surface-2 text-ink"
                                : "text-faint/60"
                            )}
                          >
                            {letter}
                          </span>
                        ))}
                      </span>
                      <span
                        className={cn(
                          "tnum w-[46px] shrink-0 text-right font-mono text-[11px]",
                          open > 0 ? "font-medium text-muted" : "text-faint/60"
                        )}
                      >
                        {open > 0 ? `${open} due` : "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          ))}
          {/* fill the tail so a short subject list rests on a considered surface */}
          <div aria-hidden className="canvas-floor min-h-16 flex-1" />
        </>
      )}

      <ClassPanel
        subject={selected}
        meetings={selected ? (meetingsBySubject.get(selected.id) ?? []) : []}
        tasks={selected ? tasks.filter((t) => taskSubjectIds(t).includes(selected.id)) : []}
        open={selected !== null}
        onClose={() => select(null)}
        onEdit={isAdmin ? (s) => { select(null); setEditing(s); } : undefined}
        nowISO={nowISO}
      />

      {isAdmin && (
        <SubjectEditor
          subject={shownEditing}
          teachers={teachers}
          strands={strands}
          open={editing !== null}
          onClose={() => setEditing(null)}
        />
      )}
    </ViewChrome>
  );
}
