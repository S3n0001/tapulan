"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
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
  setTaskDoneInClass,
} from "@/actions/tasks";
import type { TaskFull, TaskSeries } from "@/lib/domain/types";
import { describeRule } from "@/lib/domain/recurrence";
import { dueLabel, fmtDateLong, fmtDateMed, fmtMinAmPm, isISODate } from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { HueBadge, OkFlag, Status } from "@/components/ui/badge";
import { Field, Input, Textarea, Checkbox } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";
import { useIsAdmin } from "@/components/shell/admin-context";

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-[72px] shrink-0 text-[12px] text-faint">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-ink">{children}</dd>
    </div>
  );
}

export function TaskPanel({
  task,
  open,
  onClose,
  done,
  onToggleDone,
  onEdit,
  nowISO,
}: {
  task: TaskFull | null;
  open: boolean;
  onClose: () => void;
  done: boolean;
  onToggleDone: () => void;
  onEdit: (task: TaskFull) => void;
  nowISO: string;
}) {
  const isAdmin = useIsAdmin();
  const toast = useToast();
  const confirm = useConfirm();
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

  // reset the inline forms whenever a different task opens
  useEffect(() => {
    if (task) {
      setMoving(false);
      setMoveDate(task.dueDate);
      setMoveTentative(true);
      setMoveNote(task.note ?? "");
      setCancelling(false);
      setCancelReason("");
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

  if (!task) return null;

  function act(run: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) {
    start(async () => {
      const res = await run();
      if (res.ok) toast.success(okMsg);
      else toast.error(res.error ?? "Something went wrong.");
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
      title={task.title}
      description={
        task.secondarySubject
          ? `${task.subject.name} × ${task.secondarySubject.name}`
          : task.subject.name
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
            <HueBadge hue={task.type.hue}>{task.type.short}</HueBadge>
            <span className="text-[13px] text-muted">{task.type.name}</span>
          </Property>
          <Property label={task.secondarySubject ? "Classes" : "Subject"}>
            <span style={accentStyle(task.subject.hue)} className="a-dot size-2 shrink-0 rounded-full" />
            <span className="truncate">
              <span className="font-mono text-[12px] font-semibold">{task.subject.short}</span>
              <span className="ml-1.5 text-muted">{task.subject.name}</span>
            </span>
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
            <span className="font-medium">{fmtDateLong(task.dueDate)}</span>
            <span className="tnum ml-auto shrink-0 font-mono text-[12px] text-muted">
              {dueLabel(task.dueDate, now, task.dueTime)}
            </span>
          </Property>
          <Property label="Time">
            <span className="tnum font-mono text-[12.5px]">
              {task.dueTime !== null ? fmtMinAmPm(task.dueTime) : "End of day"}
            </span>
          </Property>
          {task.points !== null && (
            <Property label="Points">
              <span className="tnum font-mono text-[12.5px]">{task.points} pts</span>
            </Property>
          )}
          <Property label="Status">
            <Status status={task.status} />
            {task.doneInClass && task.status !== "cancelled" && <OkFlag>done in class</OkFlag>}
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
              <span className="ml-auto text-[11px] font-medium text-warn-text">unconfirmed</span>
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
        {task.details && (
          <section>
            <h3 className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">
              Details
            </h3>
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink/90">
              {task.details}
            </p>
          </section>
        )}

        {/* materials */}
        {task.links.length > 0 && (
          <section>
            <h3 className="mb-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">
              Materials
            </h3>
            <ul className="space-y-1.5">
              {task.links.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex h-9 items-center gap-2.5 rounded-[var(--r-card)] border border-line bg-surface px-2.5 transition-colors duration-[var(--dur-1)] hover:border-line-strong hover:bg-surface-2"
                  >
                    {link.kind === "file" ? (
                      <FileText className="size-4 shrink-0 text-muted" />
                    ) : (
                      <Link2 className="size-4 shrink-0 text-muted" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                      {link.label}
                    </span>
                    {link.kind === "file" ? (
                      <Download className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-muted" />
                    ) : (
                      <ExternalLink className="size-3.5 shrink-0 text-faint transition-colors group-hover:text-muted" />
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* admin quick actions */}
        {isAdmin && (
          <section className="rounded-[var(--r-card)] border border-line bg-surface/40 p-3">
            <h3 className="mb-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">
              Admin
            </h3>
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
