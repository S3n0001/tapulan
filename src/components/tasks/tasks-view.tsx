"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ListTodo, Plus } from "lucide-react";
import type { PeriodFull, SubjectFull, TaskFull, TaskType } from "@/lib/domain/types";
import { groupByBucket } from "@/lib/domain/tasks";
import { useNow } from "@/hooks/use-now";
import { useDone } from "@/hooks/use-done";
import { usePrefs } from "@/hooks/use-prefs";
import { useRetained } from "@/hooks/use-retained";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ViewChrome } from "@/components/shell/view-chrome";
import { useIsAdmin } from "@/components/shell/admin-context";
import { TaskListRow } from "./task-list-row";
import { TaskPanel } from "./task-panel";
import { TaskEditor } from "./task-editor";

type TypeFilter = number | "all";

/**
 * The requirements list. Selection lives in the URL (?task=id) so the ⌘K
 * palette, shared links, and the Today view all open the same panel.
 * Inside the admin dashboard it runs embedded: local selection, no toolbar.
 */
export function TasksView({
  tasks,
  subjects,
  types,
  periods,
  nowISO,
  embedded = false,
}: {
  tasks: TaskFull[];
  subjects: SubjectFull[];
  types: TaskType[];
  /** the strand's schedule — lets the editor resolve held-in-class meeting times */
  periods: PeriodFull[];
  nowISO: string;
  embedded?: boolean;
}) {
  const now = useNow(nowISO, 60_000);
  const { isDone, toggle } = useDone();
  const toast = useToast();
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // personal "done for me" toggle silently flipped state with no feedback;
  // surface a brief toast, with the toggle itself doubling as the undo (tap
  // the row's check / the panel button again to flip back)
  const toggleDoneWithToast = useCallback(
    (id: number) => {
      const willBeDone = !isDone(id);
      toggle(id);
      toast.info(willBeDone ? "Marked done for you" : "Marked not done");
    },
    [isDone, toggle, toast]
  );

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  // "show done & cancelled" is a device preference, shared with the Settings page
  const { prefs, setPref } = usePrefs();
  const showDone = prefs.showDone;
  const [localSelected, setLocalSelected] = useState<number | null>(null);
  const [editing, setEditing] = useState<TaskFull | "new" | null>(null);
  // retained through the close so the editor's exit animation plays with the
  // last-edited task still on it (mirrors TaskPanel's own snapshot)
  const shownEditing = useRetained(editing);

  // URL-driven selection (deep links) outside admin; local state inside
  const urlSelected = Number(searchParams.get("task")) || null;
  const selectedId = embedded ? localSelected : urlSelected;

  const select = useCallback(
    (id: number | null) => {
      if (embedded) {
        setLocalSelected(id);
      } else {
        router.replace(id === null ? pathname : `${pathname}?task=${id}`, { scroll: false });
      }
    },
    [embedded, router, pathname]
  );

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (typeFilter !== "all" && t.typeId !== typeFilter) return false;
      if (!showDone) {
        if (t.status === "cancelled" || t.status === "done" || t.doneInClass) return false;
        if (isDone(t.id)) return false;
      }
      return true;
    });
  }, [tasks, typeFilter, showDone, isDone]);

  const groups = useMemo(() => groupByBucket(filtered, now), [filtered, now]);

  const typeCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const t of tasks) {
      if (t.status === "cancelled" || t.status === "done" || t.doneInClass) continue;
      counts.set(t.typeId, (counts.get(t.typeId) ?? 0) + 1);
    }
    return counts;
  }, [tasks]);

  const selected = selectedId !== null ? (tasks.find((t) => t.id === selectedId) ?? null) : null;
  const openCount = useMemo(
    () =>
      tasks.filter(
        (t) => (t.status === "confirmed" || t.status === "tentative") && !t.doneInClass
      ).length,
    [tasks]
  );

  const filterRow = (
    <div className="flex items-center gap-1.5 overflow-x-auto px-3.5 pb-2.5 no-scrollbar lg:px-4">
      <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
        All
        <span className="tnum ml-1.5 font-mono text-[11px] opacity-60">{openCount}</span>
      </FilterChip>
      {types
        .filter((t) => typeCounts.has(t.id))
        .map((t) => (
          <FilterChip key={t.id} active={typeFilter === t.id} onClick={() => setTypeFilter(t.id)}>
            {t.name}
            <span className="tnum ml-1.5 font-mono text-[11px] opacity-60">
              {typeCounts.get(t.id)}
            </span>
          </FilterChip>
        ))}
    </div>
  );

  const controls = (
    <>
      <Checkbox
        checked={showDone}
        onChange={(v) => setPref("showDone", v)}
        label="Done & cancelled"
      />
      {isAdmin && (
        <Button size="sm" variant="primary" onClick={() => setEditing("new")}>
          <Plus className="size-3.5" />
          New task
        </Button>
      )}
    </>
  );

  const content = (
    <>
      {groups.length === 0 ? (
        <EmptyState
          fill
          icon={ListTodo}
          title={typeFilter !== "all" || showDone ? "Nothing matches these filters" : "All clear"}
          action={
            isAdmin && typeFilter === "all" ? (
              <Button size="sm" variant="secondary" onClick={() => setEditing("new")}>
                <Plus className="size-3.5" />
                Add the first task
              </Button>
            ) : undefined
          }
        >
          {typeFilter !== "all" || showDone
            ? "Try a different type filter, or include done and cancelled."
            : "New requirements show up here the moment an admin posts them."}
        </EmptyState>
      ) : (
        <>
          <div>
            {groups.map((group) => (
              <section key={group.bucket}>
                <div
                  className={cn(
                    "sticky z-10 flex h-7 items-center gap-2 border-b border-line/70 bg-[color-mix(in_oklab,var(--surface)_45%,var(--bg))] px-3.5 backdrop-blur lg:px-4",
                    embedded
                      ? "top-0"
                      : "top-[calc(3rem+env(safe-area-inset-top)+4.875rem)] lg:top-0"
                  )}
                >
                  <h3
                    className={cn(
                      "text-[11px] font-medium",
                      group.bucket === "overdue" ? "text-danger-text" : "text-muted"
                    )}
                  >
                    {group.label}
                  </h3>
                  <span className="tnum font-mono text-[10.5px] text-faint">
                    {group.tasks.length}
                  </span>
                </div>
                <ul className="divide-y divide-line/80">
                  {group.tasks.map((task) => (
                    <li key={task.id}>
                      <TaskListRow
                        task={task}
                        now={now}
                        done={isDone(task.id)}
                        selected={task.id === selectedId}
                        onToggleDone={() => toggleDoneWithToast(task.id)}
                        onOpen={() => select(task.id)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          {/* fill the tail so a short list rests on a considered surface —
              only in the standalone view, where the panel owns the height */}
          {!embedded && <div aria-hidden className="canvas-floor min-h-16 flex-1" />}
        </>
      )}

      <TaskPanel
        task={selected}
        subjects={subjects}
        types={types}
        open={selected !== null}
        onClose={() => select(null)}
        done={selected ? isDone(selected.id) : false}
        onToggleDone={() => selected && toggleDoneWithToast(selected.id)}
        onEdit={(t) => {
          // close the detail panel first, then open the editor a frame later
          // — doing both in the same tick races the closing Panel's
          // focus-restore against the opening editor's autofocus
          select(null);
          requestAnimationFrame(() => setEditing(t));
        }}
        nowISO={nowISO}
      />

      {isAdmin && (
        <TaskEditor
          task={shownEditing === null || shownEditing === "new" ? null : shownEditing}
          subjects={subjects}
          types={types}
          periods={periods}
          open={editing !== null}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );

  if (embedded) {
    return (
      <div>
        <div className="border-b border-line">
          <div className="flex h-11 items-center gap-2 px-3.5 lg:px-4">
            <span className="tnum font-mono text-[12px] text-faint">{openCount} open</span>
            <div className="ml-auto flex items-center gap-2">{controls}</div>
          </div>
          {filterRow}
        </div>
        {content}
      </div>
    );
  }

  return (
    <ViewChrome
      title="Tasks"
      icon={ListTodo}
      crumbs={
        selected
          ? [
              { label: "Tasks", onClick: () => select(null) },
              { label: selected.subject.short, mono: true },
              { label: selected.title },
            ]
          : undefined
      }
      meta={<span className="tnum">{openCount} open</span>}
      right={controls}
      subrow={filterRow}
    >
      {content}
    </ViewChrome>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "tap inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-[var(--r-chip)] border px-2 text-[11.5px] font-medium",
        active
          ? "border-transparent bg-[color-mix(in_oklab,var(--brand)_16%,var(--bg))] text-brand-text"
          : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}
