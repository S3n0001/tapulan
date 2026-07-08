"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  taskSubjectIds,
  type PeriodFull,
  type Strand,
  type SubjectFull,
  type TaskFull,
  type Teacher,
} from "@/lib/domain/types";
import { useRetained } from "@/hooks/use-retained";
import { useIsAdmin } from "@/components/shell/admin-context";
import { SubjectEditor } from "@/components/admin/subject-editor";
import { ClassPanel } from "./class-panel";

/**
 * A single, app-wide class-detail surface. Anywhere a class shows up — the
 * Today timeline, the Week canvas, the ⌘K palette — clicking it should peek
 * its info in the same slide-over the Classes page uses, not yank you off to
 * another route. Consumers call `openClass(id)`; the panel (and the admin
 * editor it hands off to) lives here, mounted once at the shell.
 *
 * The dedicated /classes index keeps its own URL-driven selection (`?c=`) so
 * a class there stays deep-linkable; everywhere else the peek is ephemeral.
 */

interface ClassDetailApi {
  openClass: (id: number) => void;
}

const ClassDetailContext = createContext<ClassDetailApi | null>(null);

/** Open a class's detail panel from anywhere under the provider. */
export function useClassDetail(): ClassDetailApi {
  return useContext(ClassDetailContext) ?? NOOP;
}

const NOOP: ClassDetailApi = { openClass: () => {} };

export function ClassDetailProvider({
  subjects,
  periods,
  tasks,
  teachers,
  strands,
  nowISO,
  children,
}: {
  subjects: SubjectFull[];
  periods: PeriodFull[];
  tasks: TaskFull[];
  teachers: Teacher[];
  strands: Strand[];
  nowISO: string;
  children: ReactNode;
}) {
  const isAdmin = useIsAdmin();
  const [openId, setOpenId] = useState<number | null>(null);
  const [editing, setEditing] = useState<SubjectFull | null>(null);
  // retained through the close so the editor's exit animation plays intact
  const shownEditing = useRetained(editing);

  const openClass = useCallback((id: number) => setOpenId(id), []);
  const api = useMemo<ClassDetailApi>(() => ({ openClass }), [openClass]);

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

  const selected = openId !== null ? (subjects.find((s) => s.id === openId) ?? null) : null;

  return (
    <ClassDetailContext.Provider value={api}>
      {children}

      <ClassPanel
        subject={selected}
        meetings={selected ? (meetingsBySubject.get(selected.id) ?? []) : []}
        tasks={selected ? tasks.filter((t) => taskSubjectIds(t).includes(selected.id)) : []}
        open={selected !== null}
        onClose={() => setOpenId(null)}
        onEdit={isAdmin ? (s) => { setOpenId(null); setEditing(s); } : undefined}
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
    </ClassDetailContext.Provider>
  );
}
