"use client";

import { useMemo, useState } from "react";
import { BookPlus, Plus, UserPlus } from "lucide-react";
import type { Strand, SubjectFull, Teacher } from "@/lib/domain/types";
import { accentStyle } from "@/lib/domain/hues";
import { useRetained } from "@/hooks/use-retained";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { SubjectEditor } from "./subject-editor";
import { TeacherEditor } from "./teacher-editor";

export function SubjectsTab({
  subjects,
  teachers,
  strands,
}: {
  subjects: SubjectFull[];
  teachers: Teacher[];
  strands: Strand[];
}) {
  const [editingSubject, setEditingSubject] = useState<SubjectFull | "new" | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | "new" | null>(null);
  // retained through the close so each panel's exit animation plays with its
  // last-edited record still on it
  const shownSubject = useRetained(editingSubject);
  const shownTeacher = useRetained(editingTeacher);

  const subjectCountByTeacher = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of subjects) {
      if (s.teacherId === null) continue;
      map.set(s.teacherId, (map.get(s.teacherId) ?? 0) + 1);
    }
    return map;
  }, [subjects]);

  return (
    <div>
      {/* subjects */}
      <div className="flex h-11 items-center gap-2 border-b border-line px-3.5 lg:px-4">
        <span className="tnum font-mono text-[12px] text-faint">
          {subjects.length} subjects
        </span>
        <Button size="sm" variant="primary" className="ml-auto" onClick={() => setEditingSubject("new")}>
          <Plus className="size-3.5" />
          New subject
        </Button>
      </div>

      {subjects.length === 0 ? (
        <EmptyState
          icon={BookPlus}
          title="No subjects yet"
          action={
            <Button size="sm" variant="secondary" onClick={() => setEditingSubject("new")}>
              <Plus className="size-3.5" />
              New subject
            </Button>
          }
        >
          Start with the subjects, then attach periods and tasks to them.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line/60">
          {subjects.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setEditingSubject(s)}
                className="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors duration-[var(--dur-1)] hover:bg-surface/70 lg:h-10 lg:px-4 lg:py-0"
              >
                <span style={accentStyle(s.hue)} className="a-dot size-2.5 shrink-0 rounded-[3.5px]" />
                <span className="w-[70px] shrink-0 truncate font-mono text-[11.5px] font-semibold text-muted">
                  {s.short}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                  {s.name}
                </span>
                <span className="hidden w-[140px] shrink-0 truncate text-[12px] text-muted md:block">
                  {s.teacher?.name ?? "—"}
                </span>
                <span className="shrink-0 rounded-[4px] bg-surface-2 px-1 font-mono text-[10px] font-semibold text-muted">
                  {s.strand ?? "CORE"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* teachers */}
      <div className="mt-4 flex h-11 items-center gap-2 border-y border-line px-3.5 lg:px-4">
        <span className="tnum font-mono text-[12px] text-faint">{teachers.length} teachers</span>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setEditingTeacher("new")}>
          <Plus className="size-3.5" />
          New teacher
        </Button>
      </div>

      {teachers.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No teachers yet"
          action={
            <Button size="sm" variant="secondary" onClick={() => setEditingTeacher("new")}>
              <Plus className="size-3.5" />
              New teacher
            </Button>
          }
        >
          Add teachers so subjects and period overrides can reference them.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line/60">
          {teachers.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setEditingTeacher(t)}
                className="flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors duration-[var(--dur-1)] hover:bg-surface/70 lg:h-10 lg:px-4 lg:py-0"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                  {t.name}
                </span>
                <span className="hidden min-w-0 flex-1 truncate text-[12px] text-muted sm:block">
                  {t.note ?? ""}
                </span>
                <span className="tnum shrink-0 font-mono text-[11px] text-faint">
                  {subjectCountByTeacher.get(t.id) ?? 0} subj
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <SubjectEditor
        subject={shownSubject === null || shownSubject === "new" ? null : shownSubject}
        teachers={teachers}
        strands={strands}
        open={editingSubject !== null}
        onClose={() => setEditingSubject(null)}
      />
      <TeacherEditor
        teacher={shownTeacher === null || shownTeacher === "new" ? null : shownTeacher}
        open={editingTeacher !== null}
        onClose={() => setEditingTeacher(null)}
      />
    </div>
  );
}
