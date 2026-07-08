"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Info,
  Link2,
  Maximize2,
  Pencil,
  Repeat,
  RotateCcw,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  cancelTask,
  confirmTask,
  deleteTask,
  deleteTaskSeries,
  describeTaskSeries,
  moveTask,
  patchTask,
  setTaskDoneInClass,
  type TaskPatch,
} from "@/actions/tasks";
import type { SubjectFull, TaskFull, TaskSeries, TaskType } from "@/lib/domain/types";
import { dueMinOf } from "@/lib/domain/tasks";
import { describeRule } from "@/lib/domain/recurrence";
import {
  addDays,
  dueLabel,
  fmtDateLong,
  fmtDateMed,
  fmtMinAmPm,
  isISODate,
  schoolWeekMonday,
  toISODate,
} from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { HueBadge, InfoFlag, OkFlag, Status } from "@/components/ui/badge";
import { Field, Input, Textarea, Checkbox } from "@/components/ui/field";
import { Popover } from "@/components/ui/popover";
import { MenuItem } from "@/components/ui/menu";
import { InlineText, InlineTextArea } from "@/components/ui/inline-text";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { MaterialViewer, isPreviewable } from "@/components/ui/material-viewer";
import { usePrefs } from "@/hooks/use-prefs";
import { useIsAdmin } from "@/components/shell/admin-context";

/**
 * Backstop for unsanitized stored URLs: only ever render an href for http(s)
 * links or our own uploaded-file paths. Anything else (javascript:, data:,
 * etc.) renders as plain text instead of a clickable link.
 */
function safeHref(url: string): string | null {
  if (url.startsWith("/api/files/")) return url;
  try {
    // a base is only needed to resolve protocol-relative/relative inputs;
    // any fixed http(s) base works since we only read back the parsed result
    const parsed = new URL(url, "https://tapulan.invalid");
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return url;
  } catch {
    // not a parseable URL — fall through to null
  }
  return null;
}

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-[72px] shrink-0 text-[12px] text-faint">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-ink">{children}</dd>
    </div>
  );
}

/** A property value that opens an editor — keeps the read appearance, hover reveals it. */
const ROW_TRIGGER =
  "tap -mx-1 flex min-w-0 items-center gap-2 rounded-[4px] px-1 py-0.5 text-left transition-colors hover:bg-surface-2";

/** Menu-item list inside a Popover, with the Menu's arrow-key focus walk. */
function PickerList({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  function onKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [
      ...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []),
    ];
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown"
        ? items[(idx + 1) % items.length]
        : items[(idx - 1 + items.length) % items.length];
    next.focus();
  }
  return (
    <div ref={ref} role="menu" aria-label={label} onKeyDown={onKey} className="max-h-[320px] overflow-y-auto">
      {children}
    </div>
  );
}

/** Click-to-edit points: a bare number input in place, empty clears them. */
function PointsInline({
  value,
  onCommit,
}: {
  value: number | null;
  onCommit: (points: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const refocusRef = useRef(false);

  useLayoutEffect(() => {
    if (editing) {
      inputRef.current?.focus({ preventScroll: true });
      inputRef.current?.select();
    } else if (refocusRef.current) {
      refocusRef.current = false;
      buttonRef.current?.focus({ preventScroll: true });
    }
  }, [editing]);

  if (!editing) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          cancelRef.current = false;
          setDraft(value !== null ? String(value) : "");
          setEditing(true);
        }}
        className={cn(
          "tnum cursor-text rounded-[3px] text-left font-mono text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_45%,transparent)]",
          value === null && "text-faint"
        )}
      >
        {value !== null ? `${value} pts` : "Add points"}
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <input
        ref={inputRef}
        type="number"
        min={0}
        inputMode="numeric"
        value={draft}
        placeholder="—"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (cancelRef.current) return;
          const raw = draft.trim();
          const next = raw === "" ? null : Number(raw);
          if (next !== null && (!Number.isFinite(next) || next < 0)) return;
          if (next !== value) onCommit(next);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            refocusRef.current = true;
            inputRef.current?.blur();
          } else if (e.key === "Escape") {
            // React delegates at the document root, where the Panel also
            // listens — stopPropagation alone can't shield it
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            cancelRef.current = true;
            refocusRef.current = true;
            inputRef.current?.blur();
          }
        }}
        className="tnum w-16 rounded-[3px] border-none bg-[color-mix(in_oklab,var(--brand)_7%,transparent)] p-0 font-mono text-[12.5px] outline-none [appearance:textfield] placeholder:text-faint [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="font-mono text-[12.5px] text-faint">pts</span>
    </span>
  );
}

export function TaskPanel({
  task: taskProp,
  open,
  onClose,
  done,
  onToggleDone,
  onEdit,
  nowISO,
  subjects,
  types,
}: {
  task: TaskFull | null;
  open: boolean;
  onClose: () => void;
  done: boolean;
  onToggleDone: () => void;
  onEdit: (task: TaskFull) => void;
  nowISO: string;
  /** editor data for the inline pickers — absent keeps those rows read-only */
  subjects?: SubjectFull[];
  types?: TaskType[];
}) {
  const isAdmin = useIsAdmin();
  const toast = useToast();
  const confirm = useConfirm();
  const { prefs } = usePrefs();
  const now = useNow(nowISO, 60_000);
  const [pending, start] = useTransition();
  const [moving, setMoving] = useState(false);
  const [moveDate, setMoveDate] = useState("");
  const [moveTentative, setMoveTentative] = useState(true);
  const [moveNote, setMoveNote] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [series, setSeries] = useState<
    (TaskSeries & { total: number; upcomingOpen: number }) | null
  >(null);
  const [picker, setPicker] = useState<"due" | "type" | "subject" | null>(null);
  const [dueDraft, setDueDraft] = useState("");
  const dueRef = useRef<HTMLButtonElement>(null);
  const typeRef = useRef<HTMLButtonElement>(null);
  const subjectRef = useRef<HTMLButtonElement>(null);
  // optimistic overlay — a committed inline edit shows instantly; the server
  // refresh (or a failure) reconciles it
  const [override, setOverride] = useState<{ id: number; patch: Partial<TaskFull> } | null>(null);
  // which material the in-app viewer is showing, or null when it's closed
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // The Panel plays its own exit animation on close. The callers clear the
  // selected task the moment they close, which would unmount this content
  // and skip that animation — so retain the last shown task and render from
  // that snapshot while it animates out.
  const [snap, setSnap] = useState(taskProp);
  useEffect(() => {
    if (taskProp) setSnap(taskProp);
  }, [taskProp]);
  const task = taskProp ?? snap;

  // reset the inline forms whenever a different task opens
  useEffect(() => {
    if (task) {
      setMoving(false);
      setMoveDate(task.dueDate);
      setMoveTentative(true);
      setMoveNote(task.note ?? "");
      setCancelling(false);
      setCancelReason("");
      setPicker(null);
      setOverride(null);
      setViewerIndex(null);
    }
  }, [task]);

  // load the repeating-series details for the "Repeats" card, if any
  const seriesId = task?.seriesId ?? null;
  useEffect(() => {
    setSeries(null);
    if (seriesId === null) return;
    let alive = true;
    void describeTaskSeries(seriesId).then((res) => {
      if (alive && res.ok) setSeries(res.data);
    });
    return () => {
      alive = false;
    };
  }, [seriesId]);

  // null only when no task has ever been shown — after that the snapshot
  // keeps the Panel mounted so its exit animation can play
  if (!task) return null;

  // what the panel shows: the task with any optimistic inline edits on top
  const t = override && override.id === task.id ? { ...task, ...override.patch } : task;

  const tomorrowISO = toISODate(addDays(now, 1));
  // "next week" = the coming Monday; on weekends schoolWeekMonday already is it
  const weekMonday = schoolWeekMonday(now);
  const nextWeekISO = toISODate(
    weekMonday.getTime() > now.getTime() ? weekMonday : addDays(weekMonday, 7)
  );

  function act(run: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const res = await run();
      if (res.ok) toast.success(okMsg);
      else toast.error(res.error ?? "Something went wrong.");
    });
  }

  function commitPatch(patch: TaskPatch, shown: Partial<TaskFull>, okMsg: string) {
    const id = task!.id;
    setOverride((o) => ({ id, patch: { ...(o && o.id === id ? o.patch : null), ...shown } }));
    start(async () => {
      const res = await patchTask(id, patch);
      if (res.ok) toast.success(okMsg);
      else {
        setOverride(null);
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  }

  // one-click move — same defaults as the move form: tentative, note kept
  function quickMove(toDate: string) {
    if (!isISODate(toDate)) {
      toast.error("Pick a valid new date.");
      return;
    }
    const id = task!.id;
    setPicker(null);
    setOverride((o) => ({ id, patch: { ...(o && o.id === id ? o.patch : null), dueDate: toDate } }));
    start(async () => {
      const res = await moveTask(id, toDate, { tentative: true, note: task!.note });
      if (res.ok) toast.success("Moved — marked unconfirmed");
      else {
        setOverride(null);
        toast.error(res.error ?? "Couldn't move the task.");
      }
    });
  }

  function submitMove() {
    if (!isISODate(moveDate)) {
      toast.error("Pick a valid new date.");
      return;
    }
    start(async () => {
      const res = await moveTask(task!.id, moveDate, {
        tentative: moveTentative,
        note: moveNote.trim() || null,
      });
      if (res.ok) {
        toast.success(moveTentative ? "Moved — marked unconfirmed" : "Date moved");
        setMoving(false);
      } else toast.error(res.error ?? "Couldn't move the task.");
    });
  }

  function submitCancel() {
    start(async () => {
      const res = await cancelTask(task!.id, cancelReason.trim() || null);
      if (res.ok) {
        toast.success("Task cancelled");
        setCancelling(false);
      } else toast.error(res.error ?? "Couldn't cancel the task.");
    });
  }

  async function remove() {
    const yes = await confirm({
      title: "Delete this task?",
      description: `“${task!.title}” disappears for the whole section. This can't be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await deleteTask(task!.id);
      if (res.ok) {
        toast.success("Task deleted");
        onClose();
      } else toast.error(res.error ?? "Couldn't delete the task.");
    });
  }

  async function removeSeries() {
    if (!series) return;
    const yes = await confirm({
      title: "Delete this repeating series?",
      description:
        series.upcomingOpen > 0
          ? `${series.upcomingOpen} upcoming task${
              series.upcomingOpen === 1 ? "" : "s"
            } in this series will be removed. Past and done ones are kept.`
          : "This removes the repeat rule. Past and done occurrences are kept.",
      confirmLabel: "Delete series",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await deleteTaskSeries(series.id);
      if (res.ok) {
        toast.success(
          res.data.deleted > 0
            ? `Removed ${res.data.deleted} upcoming task${res.data.deleted === 1 ? "" : "s"}`
            : "Series deleted"
        );
        onClose();
      } else toast.error(res.error ?? "Couldn't delete the series.");
    });
  }

  return (
    <Panel
      open={open}
      onClose={onClose}
      modal={false}
      title={
        <InlineText
          value={t.title}
          disabled={!isAdmin}
          onCommit={(v) => commitPatch({ title: v }, { title: v }, "Title updated")}
        />
      }
      description={
        t.secondarySubject ? `${t.subject.name} × ${t.secondarySubject.name}` : t.subject.name
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onToggleDone}
            className={cn("mr-auto", done && "text-ok-text")}
          >
            <Check className="size-4" />
            {done ? "Done for me" : "Mark done for me"}
          </Button>
          {isAdmin && (
            <Button variant="primary" onClick={() => onEdit(task)}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        {/* properties */}
        <dl className="space-y-2.5">
          <Property label="Type">
            {isAdmin && types ? (
              <>
                <button
                  ref={typeRef}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={picker === "type"}
                  onClick={() => setPicker(picker === "type" ? null : "type")}
                  className={cn(ROW_TRIGGER, "flex-1")}
                >
                  <HueBadge hue={t.type.hue}>{t.type.short}</HueBadge>
                  <span className="truncate text-[13px] text-muted">{t.type.name}</span>
                </button>
                <Popover open={picker === "type"} onClose={() => setPicker(null)} anchorRef={typeRef}>
                  <PickerList label="Task type">
                    {types.map((ty) => (
                      <MenuItem
                        key={ty.id}
                        selected={ty.id === t.typeId}
                        icon={<span style={accentStyle(ty.hue)} className="a-dot size-2 rounded-full" />}
                        trailing={<span className="font-mono text-[10.5px] text-faint">{ty.short}</span>}
                        onSelect={() => {
                          setPicker(null);
                          if (ty.id !== t.typeId)
                            commitPatch({ typeId: ty.id }, { typeId: ty.id, type: ty }, "Type updated");
                        }}
                      >
                        {ty.name}
                      </MenuItem>
                    ))}
                  </PickerList>
                </Popover>
              </>
            ) : (
              <>
                <HueBadge hue={t.type.hue}>{t.type.short}</HueBadge>
                <span className="text-[13px] text-muted">{t.type.name}</span>
              </>
            )}
          </Property>
          <Property label={task.secondarySubject ? "Classes" : "Subject"}>
            {isAdmin && subjects ? (
              <>
                <button
                  ref={subjectRef}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={picker === "subject"}
                  onClick={() => setPicker(picker === "subject" ? null : "subject")}
                  className={cn(ROW_TRIGGER, "flex-1")}
                >
                  <span style={accentStyle(t.subject.hue)} className="a-dot size-2 shrink-0 rounded-full" />
                  <span className="truncate">
                    <span className="font-mono text-[12px] font-semibold">{t.subject.short}</span>
                    <span className="ml-1.5 text-muted">{t.subject.name}</span>
                  </span>
                </button>
                <Popover
                  open={picker === "subject"}
                  onClose={() => setPicker(null)}
                  anchorRef={subjectRef}
                  width={264}
                >
                  <PickerList label="Subject">
                    {subjects.map((s) => (
                      <MenuItem
                        key={s.id}
                        selected={s.id === t.subjectId}
                        disabled={s.id === t.secondarySubjectId}
                        icon={<span style={accentStyle(s.hue)} className="a-dot size-2 rounded-full" />}
                        trailing={<span className="font-mono text-[10.5px] text-faint">{s.short}</span>}
                        onSelect={() => {
                          setPicker(null);
                          if (s.id !== t.subjectId)
                            commitPatch(
                              { subjectId: s.id },
                              { subjectId: s.id, subject: s },
                              "Subject updated"
                            );
                        }}
                      >
                        {s.name}
                      </MenuItem>
                    ))}
                  </PickerList>
                </Popover>
              </>
            ) : (
              <>
                <span style={accentStyle(t.subject.hue)} className="a-dot size-2 shrink-0 rounded-full" />
                <span className="truncate">
                  <span className="font-mono text-[12px] font-semibold">{t.subject.short}</span>
                  <span className="ml-1.5 text-muted">{t.subject.name}</span>
                </span>
              </>
            )}
          </Property>
          {task.secondarySubject && (
            <Property label="Collab">
              <span
                style={accentStyle(task.secondarySubject.hue)}
                className="a-dot size-2 shrink-0 rounded-full"
              />
              <span className="truncate">
                <span className="font-mono text-[12px] font-semibold">
                  {task.secondarySubject.short}
                </span>
                <span className="ml-1.5 text-muted">{task.secondarySubject.name}</span>
              </span>
            </Property>
          )}
          <Property label="Due">
            {isAdmin ? (
              <>
                <button
                  ref={dueRef}
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={picker === "due"}
                  onClick={() => {
                    setDueDraft(t.dueDate);
                    setPicker(picker === "due" ? null : "due");
                  }}
                  className={cn(ROW_TRIGGER, "font-medium")}
                >
                  {fmtDateLong(t.dueDate)}
                </button>
                <Popover
                  open={picker === "due"}
                  onClose={() => setPicker(null)}
                  anchorRef={dueRef}
                  width={248}
                >
                  <div className="space-y-2 p-1">
                    <Input
                      type="date"
                      aria-label="New due date"
                      value={dueDraft}
                      data-autofocus
                      onChange={(e) => setDueDraft(e.target.value)}
                    />
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="secondary" onClick={() => quickMove(tomorrowISO)}>
                        Tomorrow
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => quickMove(nextWeekISO)}>
                        Next week
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={pending}
                        className="ml-auto"
                        onClick={() => quickMove(dueDraft)}
                      >
                        Move
                      </Button>
                    </div>
                    <p className="px-0.5 text-[11px] leading-snug text-faint">
                      Marked unconfirmed until the teacher confirms.
                    </p>
                  </div>
                </Popover>
              </>
            ) : (
              <span className="font-medium">{fmtDateLong(t.dueDate)}</span>
            )}
            <span className="tnum ml-auto shrink-0 font-mono text-[12px] text-muted">
              {dueLabel(t.dueDate, now, dueMinOf(task))}
            </span>
          </Property>
          <Property label="Time">
            {task.heldInClass ? (
              <span className="flex flex-1 items-center gap-2">
                <InfoFlag>In class</InfoFlag>
                <span className="tnum font-mono text-[12.5px] text-muted">
                  {task.dueTime !== null
                    ? fmtMinAmPm(task.dueTime)
                    : task.classMeeting
                      ? `${
                          (task.classMeeting.subjectId === task.secondarySubjectId
                            ? task.secondarySubject
                            : task.subject
                          )?.short ?? task.subject.short
                        } · ${fmtMinAmPm(task.classMeeting.start)}–${fmtMinAmPm(task.classMeeting.end)}`
                      : "when the class meets"}
                </span>
              </span>
            ) : (
              <span className="tnum font-mono text-[12.5px]">
                {task.dueTime !== null ? fmtMinAmPm(task.dueTime) : "End of day"}
              </span>
            )}
          </Property>
          {(task.points !== null || isAdmin) && (
            <Property label="Points">
              {isAdmin ? (
                <PointsInline
                  value={t.points}
                  onCommit={(v) => commitPatch({ points: v }, { points: v }, "Points updated")}
                />
              ) : (
                <span className="tnum font-mono text-[12.5px]">{task.points} pts</span>
              )}
            </Property>
          )}
          <Property label="Status">
            <Status status={task.status} />
            {task.doneInClass && task.status !== "cancelled" && <OkFlag>Done in class</OkFlag>}
            {task.heldInClass && !task.doneInClass && task.status !== "cancelled" && (
              <InfoFlag>In class</InfoFlag>
            )}
          </Property>
        </dl>

        {/* cancellation — the dominant state, with an optional reason */}
        {task.status === "cancelled" && (
          <div className="flex gap-2.5 rounded-[var(--r-card)] border border-line bg-surface/60 px-3 py-2.5">
            <XCircle className="mt-0.5 size-4 shrink-0 text-faint" />
            <div className="min-w-0 space-y-0.5">
              <p className="text-[12.5px] font-semibold text-muted">Cancelled</p>
              <p
                className={cn(
                  "text-[13px] leading-relaxed",
                  task.cancelReason ? "text-ink/90" : "text-faint"
                )}
              >
                {task.cancelReason ?? "No reason given."}
              </p>
            </div>
          </div>
        )}

        {/* repeating series — this task is one occurrence of a pattern */}
        {task.seriesId && (
          <div className="flex items-center gap-2.5 rounded-[var(--r-card)] border border-line bg-surface/60 px-3 py-2.5 text-[12.5px]">
            <Repeat className="size-4 shrink-0 text-muted" />
            <span className="font-medium text-muted">Repeats</span>
            {series ? (
              <span className="truncate text-ink/90">{describeRule(series)}</span>
            ) : (
              <span className="text-faint">part of a series</span>
            )}
            {series && (
              <span className="tnum ml-auto shrink-0 font-mono text-[11px] text-faint">
                {series.total} total
              </span>
            )}
          </div>
        )}

        {/* moved history — honest dates, never silent edits */}
        {task.movedFrom && (
          <div className="flex items-center gap-2 rounded-[var(--r-card)] border border-[color-mix(in_oklab,var(--warn)_35%,var(--line))] bg-[color-mix(in_oklab,var(--warn)_10%,var(--bg))] px-3 py-2.5 text-[12.5px]">
            <CalendarClock className="size-4 shrink-0 text-warn-text" />
            <span className="font-medium text-warn-text">Moved</span>
            <span className="tnum font-mono text-muted line-through">
              {fmtDateMed(task.movedFrom)}
            </span>
            <ArrowRight className="size-3.5 text-faint" aria-label="to" />
            <span className="tnum font-mono font-semibold text-ink">
              {fmtDateMed(task.dueDate)}
            </span>
            {task.status === "tentative" && (
              <span className="ml-auto text-[11px] font-medium text-warn-text">Unconfirmed</span>
            )}
          </div>
        )}

        {/* clarification note */}
        {task.note && (
          <div className="flex gap-2.5 rounded-[var(--r-card)] bg-[color-mix(in_oklab,var(--warn)_12%,var(--bg))] px-3 py-2.5">
            <Info className="mt-0.5 size-4 shrink-0 text-warn-text" />
            <p className="text-[13px] leading-relaxed text-ink">{task.note}</p>
          </div>
        )}

        {/* details */}
        {(task.details || isAdmin) && (
          <section>
            <h3 className="mb-1.5 text-[11px] font-medium text-muted">Details</h3>
            <InlineTextArea
              value={t.details}
              disabled={!isAdmin}
              placeholder="Add details…"
              onCommit={(v) => commitPatch({ details: v }, { details: v }, "Details updated")}
              className="text-[13.5px] leading-relaxed text-ink/90"
            />
          </section>
        )}

        {/* materials — previewable ones (images, PDFs, text) open in an in-app
            viewer; office files and external links keep their honest new-tab
            open. The "Open materials in a new tab" pref forces everything out. */}
        {task.links.length > 0 && (
          <section>
            <h3 className="mb-1.5 text-[11px] font-medium text-muted">Materials</h3>
            <ul className="space-y-1.5">
              {task.links.map((link, idx) => {
                const href = safeHref(link.url);
                const inApp = href !== null && isPreviewable(link) && !prefs.materialsNewTab;
                const trailing = !href ? null : inApp ? (
                  <Maximize2 className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-muted" />
                ) : link.kind === "file" ? (
                  <Download className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-muted" />
                ) : (
                  <ExternalLink className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-muted" />
                );
                const inner = (
                  <>
                    {link.kind === "file" ? (
                      <FileText className="size-4 shrink-0 text-muted" />
                    ) : (
                      <Link2 className="size-4 shrink-0 text-muted" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                      {link.label}
                    </span>
                    {trailing}
                  </>
                );
                const rowClass =
                  "group flex h-9 w-full items-center gap-2.5 rounded-[var(--r-card)] border border-line bg-surface px-2.5 text-left transition-colors duration-[var(--dur-1)] hover:border-line-strong hover:bg-surface-2";
                return (
                  <li key={link.id}>
                    {!href ? (
                      <div
                        title="This link's address isn't safe to open."
                        className="flex h-9 items-center gap-2.5 rounded-[var(--r-card)] border border-line bg-surface px-2.5 opacity-70"
                      >
                        {inner}
                      </div>
                    ) : inApp ? (
                      <button type="button" onClick={() => setViewerIndex(idx)} className={rowClass}>
                        {inner}
                      </button>
                    ) : (
                      <a href={href} target="_blank" rel="noopener noreferrer" className={rowClass}>
                        {inner}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <MaterialViewer
          links={task.links}
          index={viewerIndex}
          onIndex={setViewerIndex}
          onClose={() => setViewerIndex(null)}
        />

        {/* admin quick actions */}
        {isAdmin && (
          <section className="rounded-[var(--r-card)] border border-line bg-surface/40 p-3">
            <h3 className="mb-2.5 text-[11px] font-medium text-muted">Admin</h3>
            {moving ? (
              <div className="anim-fade space-y-3">
                <Field label="New date" htmlFor="move-date">
                  <Input
                    id="move-date"
                    type="date"
                    value={moveDate}
                    onChange={(e) => setMoveDate(e.target.value)}
                    data-autofocus
                  />
                </Field>
                <Checkbox
                  checked={moveTentative}
                  onChange={setMoveTentative}
                  label="Tentative — the teacher hasn't confirmed yet"
                />
                <Field label="Clarification" hint="optional" htmlFor="move-note">
                  <Textarea
                    id="move-note"
                    rows={2}
                    value={moveNote}
                    placeholder="e.g. Class asked to move it; waiting for the go signal."
                    onChange={(e) => setMoveNote(e.target.value)}
                  />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setMoving(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" variant="primary" loading={pending} onClick={submitMove}>
                    Save move
                  </Button>
                </div>
              </div>
            ) : cancelling ? (
              <div className="anim-fade space-y-3">
                <Field label="Reason" hint="optional" htmlFor="cancel-reason">
                  <Textarea
                    id="cancel-reason"
                    rows={2}
                    value={cancelReason}
                    placeholder="e.g. Folded into next week's unit test."
                    onChange={(e) => setCancelReason(e.target.value)}
                    data-autofocus
                  />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setCancelling(false)}>
                    Keep it
                  </Button>
                  <Button size="sm" variant="danger" loading={pending} onClick={submitCancel}>
                    <XCircle className="size-3.5" />
                    Cancel task
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" onClick={() => setMoving(true)}>
                  <CalendarClock className="size-3.5" />
                  Move date
                </Button>
                {task.status !== "cancelled" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending}
                    className={cn(task.doneInClass && "text-ok-text")}
                    onClick={() =>
                      act(
                        () => setTaskDoneInClass(task.id, !task.doneInClass),
                        task.doneInClass ? "No longer done in class" : "Marked done in class"
                      )
                    }
                  >
                    <GraduationCap className="size-3.5" />
                    {task.doneInClass ? "Not done in class" : "Done in class"}
                  </Button>
                )}
                {task.status === "tentative" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending}
                    onClick={() => act(() => confirmTask(task.id), "Marked as confirmed")}
                  >
                    <Check className="size-3.5" />
                    Confirm
                  </Button>
                )}
                {task.status !== "cancelled" ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending}
                    onClick={() => setCancelling(true)}
                  >
                    <XCircle className="size-3.5" />
                    Cancel task
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={pending}
                    onClick={() => act(() => confirmTask(task.id), "Task restored")}
                  >
                    <RotateCcw className="size-3.5" />
                    Restore
                  </Button>
                )}
                <Button size="sm" variant="danger" loading={pending} onClick={remove}>
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
                {task.seriesId && (
                  <Button size="sm" variant="danger" loading={pending} onClick={removeSeries}>
                    <Repeat className="size-3.5" />
                    Delete series
                  </Button>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </Panel>
  );
}
