"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FileText, Link2, Plus, Repeat, Trash2, Upload } from "lucide-react";
import {
  createTask,
  createTaskSeries,
  updateTask,
  type TaskInput,
  type TaskLinkInput,
} from "@/actions/tasks";
import type { SubjectFull, TaskFull, TaskStatus, TaskType } from "@/lib/domain/types";
import { TASK_STATUSES } from "@/lib/domain/types";
import { fmtDateMed, fromISODate, inputToMin, minToInput, toISODate } from "@/lib/domain/time";
import {
  describeRule,
  expandRule,
  isoWeekday,
  MONTHLY_ORDINALS,
  normalizeRule,
  weekdayShort,
  type RecurFreq,
  type RecurrenceRule,
} from "@/lib/domain/recurrence";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

const STATUS_LABEL: Record<TaskStatus, string> = {
  confirmed: "Confirmed",
  tentative: "Tentative — not yet confirmed",
  done: "Done",
  cancelled: "Cancelled",
};

/** School weekdays for the weekly picker: Mon–Fri as ISO weekday numbers. */
const WEEKDAYS = [1, 2, 3, 4, 5] as const;

interface FormState {
  title: string;
  details: string;
  subjectId: number | "";
  secondarySubjectId: number | "";
  typeId: number | "";
  dueDate: string;
  dueTime: string;
  status: TaskStatus;
  doneInClass: boolean;
  points: string;
  note: string;
  cancelReason: string;
  movedFrom: string;
  links: TaskLinkInput[];
  // recurrence (new tasks only)
  repeat: "none" | RecurFreq;
  repeatInterval: string;
  repeatWeekdays: number[];
  repeatNth: number;
  repeatWeekday: number;
  repeatEndMode: "until" | "count";
  repeatUntil: string;
  repeatCount: string;
}

function initial(task: TaskFull | null, subjects: SubjectFull[], types: TaskType[]): FormState {
  const dueDate = task ? task.dueDate : toISODate(new Date());
  const weekday = isoWeekday(fromISODate(dueDate));
  const repeatDefaults = {
    repeat: "none" as const,
    repeatInterval: "1",
    // seed the weekly picker with the due date's own weekday
    repeatWeekdays: weekday >= 1 && weekday <= 5 ? [weekday] : [1],
    repeatNth: 1,
    repeatWeekday: weekday >= 1 && weekday <= 5 ? weekday : 1,
    repeatEndMode: "count" as const,
    repeatUntil: "",
    repeatCount: "8",
  };
  if (task) {
    return {
      title: task.title,
      details: task.details,
      subjectId: task.subjectId,
      secondarySubjectId: task.secondarySubjectId ?? "",
      typeId: task.typeId,
      dueDate: task.dueDate,
      dueTime: minToInput(task.dueTime),
      status: task.status,
      doneInClass: task.doneInClass,
      points: task.points !== null ? String(task.points) : "",
      note: task.note ?? "",
      cancelReason: task.cancelReason ?? "",
      movedFrom: task.movedFrom ?? "",
      links: task.links.map((l) => ({ label: l.label, url: l.url, kind: l.kind })),
      ...repeatDefaults,
    };
  }
  return {
    title: "",
    details: "",
    subjectId: subjects[0]?.id ?? "",
    secondarySubjectId: "",
    typeId: types[0]?.id ?? "",
    dueDate,
    dueTime: "",
    status: "confirmed",
    doneInClass: false,
    points: "",
    note: "",
    cancelReason: "",
    movedFrom: "",
    links: [],
    ...repeatDefaults,
  };
}

/** Build a recurrence rule from the form (start date = the task's due date). */
function ruleFromForm(form: FormState): RecurrenceRule {
  return {
    freq: (form.repeat === "none" ? "weekly" : form.repeat) as RecurFreq,
    interval: Number(form.repeatInterval) || 1,
    weekdays: form.repeatWeekdays,
    nth: form.repeat === "monthly" ? form.repeatNth : null,
    weekday: form.repeat === "monthly" ? form.repeatWeekday : null,
    startDate: form.dueDate,
    endDate: form.repeatEndMode === "until" ? form.repeatUntil || null : null,
    count: form.repeatEndMode === "count" ? Number(form.repeatCount) || null : null,
  };
}

export function TaskEditor({
  task,
  subjects,
  types,
  open,
  onClose,
}: {
  task: TaskFull | null;
  subjects: SubjectFull[];
  types: TaskType[];
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<FormState>(() => initial(task, subjects, types));
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // reload the form whenever a different task (or "new") opens
  useEffect(() => {
    if (open) {
      setForm(initial(task, subjects, types));
      setError(null);
    }
  }, [open, task, subjects, types]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setLink = (index: number, patch: Partial<TaskLinkInput>) =>
    setForm((f) => ({
      ...f,
      links: f.links.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    }));

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = (await res.json()) as { url?: string; name?: string; error?: string };
      if (!res.ok || !json.url) {
        toast.error(json.error ?? "Upload failed.");
        return;
      }
      setForm((f) => ({
        ...f,
        links: [...f.links, { label: json.name ?? "File", url: json.url!, kind: "file" }],
      }));
      toast.success("File attached");
    } catch {
      toast.error("Upload failed — check your connection.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function submit() {
    if (!form.title.trim()) return setError("Give the task a title.");
    if (form.subjectId === "" || form.typeId === "") return setError("Pick a subject and type.");
    if (form.secondarySubjectId !== "" && form.secondarySubjectId === form.subjectId)
      return setError("The collab class has to be a different subject.");
    if (!form.dueDate) return setError("Pick a due date.");
    setError(null);

    const input: TaskInput = {
      title: form.title,
      details: form.details,
      subjectId: Number(form.subjectId),
      secondarySubjectId: form.secondarySubjectId === "" ? null : Number(form.secondarySubjectId),
      typeId: Number(form.typeId),
      dueDate: form.dueDate,
      dueTime: inputToMin(form.dueTime),
      status: form.status,
      doneInClass: form.doneInClass,
      movedFrom: form.movedFrom || null,
      cancelReason: form.cancelReason || null,
      note: form.note || null,
      points: form.points.trim() === "" ? null : Number(form.points),
      links: form.links,
    };

    const repeating = !task && form.repeat !== "none";

    start(async () => {
      if (repeating) {
        const res = await createTaskSeries(input, ruleFromForm(form));
        if (res.ok) {
          toast.success(`Added ${res.data.count} repeating task${res.data.count === 1 ? "" : "s"}`);
          onClose();
        } else {
          setError(res.error);
          toast.error(res.error);
        }
        return;
      }
      const res = task ? await updateTask(task.id, input) : await createTask(input);
      if (res.ok) {
        toast.success(task ? "Task updated" : "Task added");
        onClose();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  // live count/first/last for the repeat section (client-side, pure)
  const preview = useMemo(() => {
    if (task || form.repeat === "none") return null;
    const norm = normalizeRule(ruleFromForm(form));
    if (typeof norm === "string") return { error: norm };
    const dates = expandRule(norm);
    return dates.length === 0
      ? { error: "This pattern produces no dates." }
      : { count: dates.length, first: dates[0], last: dates[dates.length - 1], rule: norm };
  }, [task, form]);

  return (
    <Panel
      open={open}
      onClose={onClose}
      onCmdEnter={submit}
      wide
      title={task ? "Edit task" : "New task"}
      description={
        task
          ? task.secondarySubject
            ? `${task.subject.name} × ${task.secondarySubject.name}`
            : task.subject.name
          : "A new requirement for the whole section"
      }
      footer={
        <>
          {error && <p className="mr-auto text-[12px] text-danger-text">{error}</p>}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} onClick={submit}>
            {task
              ? "Save changes"
              : preview && !("error" in preview)
                ? `Add ${preview.count} task${preview.count === 1 ? "" : "s"}`
                : "Add task"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" required htmlFor="t-title">
          <Input
            id="t-title"
            value={form.title}
            data-autofocus
            placeholder="e.g. UT 1: Pagsusuri ng argumento"
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject" required htmlFor="t-subject">
            <Select
              id="t-subject"
              value={form.subjectId}
              onChange={(e) => set("subjectId", e.target.value === "" ? "" : Number(e.target.value))}
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.short} — {s.name}
                  {s.strand ? ` (${s.strand})` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type" required htmlFor="t-type">
            <Select
              id="t-type"
              value={form.typeId}
              onChange={(e) => set("typeId", e.target.value === "" ? "" : Number(e.target.value))}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Collab class"
          hint="optional — a second subject sharing this task (e.g. CPAR × PE)"
          htmlFor="t-collab"
        >
          <Select
            id="t-collab"
            value={form.secondarySubjectId}
            onChange={(e) =>
              set("secondarySubjectId", e.target.value === "" ? "" : Number(e.target.value))
            }
          >
            <option value="">No collab — single class</option>
            {subjects
              .filter((s) => s.id !== form.subjectId)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.short} — {s.name}
                  {s.strand ? ` (${s.strand})` : ""}
                </option>
              ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Due date" required htmlFor="t-date">
            <Input
              id="t-date"
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
          </Field>
          <Field label="Due time" hint="optional" htmlFor="t-time">
            <Input
              id="t-time"
              type="time"
              value={form.dueTime}
              onChange={(e) => set("dueTime", e.target.value)}
            />
          </Field>
        </div>

        {/* recurrence — only when creating; each occurrence becomes its own task */}
        {!task && (
          <div className="space-y-3 rounded-[var(--r-card)] border border-line bg-surface/40 p-3">
            <Field
              label={
                <span className="flex items-center gap-1.5">
                  <Repeat className="size-3.5 text-muted" />
                  Repeat
                </span>
              }
              hint={form.repeat === "none" ? "make this a recurring requirement" : undefined}
              htmlFor="t-repeat"
            >
              <Select
                id="t-repeat"
                value={form.repeat}
                onChange={(e) => set("repeat", e.target.value as FormState["repeat"])}
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Every school day</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Field>

            {form.repeat === "weekly" && (
              <div className="anim-fade space-y-3">
                <div className="space-y-1.5">
                  <span className="text-[12px] font-medium text-muted">On these days</span>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((wd) => {
                      const on = form.repeatWeekdays.includes(wd);
                      return (
                        <button
                          key={wd}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            set(
                              "repeatWeekdays",
                              on
                                ? form.repeatWeekdays.filter((d) => d !== wd)
                                : [...form.repeatWeekdays, wd]
                            )
                          }
                          className={cn(
                            "tap h-7 w-11 rounded-[var(--r-chip)] border text-[12px] font-medium",
                            on
                              ? "border-transparent bg-[color-mix(in_oklab,var(--brand)_16%,var(--bg))] text-brand-text"
                              : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink"
                          )}
                        >
                          {weekdayShort(wd)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Field label="Every" hint="weeks" htmlFor="t-repeat-interval">
                  <Input
                    id="t-repeat-interval"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={form.repeatInterval}
                    onChange={(e) => set("repeatInterval", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {form.repeat === "monthly" && (
              <div className="anim-fade space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Week" htmlFor="t-repeat-nth">
                    <Select
                      id="t-repeat-nth"
                      value={form.repeatNth}
                      onChange={(e) => set("repeatNth", Number(e.target.value))}
                    >
                      {MONTHLY_ORDINALS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Weekday" htmlFor="t-repeat-weekday">
                    <Select
                      id="t-repeat-weekday"
                      value={form.repeatWeekday}
                      onChange={(e) => set("repeatWeekday", Number(e.target.value))}
                    >
                      {WEEKDAYS.map((wd) => (
                        <option key={wd} value={wd}>
                          {weekdayShort(wd)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Field label="Every" hint="months" htmlFor="t-repeat-interval">
                  <Input
                    id="t-repeat-interval"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={form.repeatInterval}
                    onChange={(e) => set("repeatInterval", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {form.repeat !== "none" && (
              <div className="anim-fade space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ends" htmlFor="t-repeat-end">
                    <Select
                      id="t-repeat-end"
                      value={form.repeatEndMode}
                      onChange={(e) =>
                        set("repeatEndMode", e.target.value as FormState["repeatEndMode"])
                      }
                    >
                      <option value="count">After a number of times</option>
                      <option value="until">On a date</option>
                    </Select>
                  </Field>
                  {form.repeatEndMode === "count" ? (
                    <Field label="Times" htmlFor="t-repeat-count">
                      <Input
                        id="t-repeat-count"
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={form.repeatCount}
                        onChange={(e) => set("repeatCount", e.target.value)}
                      />
                    </Field>
                  ) : (
                    <Field label="Until" htmlFor="t-repeat-until">
                      <Input
                        id="t-repeat-until"
                        type="date"
                        min={form.dueDate}
                        value={form.repeatUntil}
                        onChange={(e) => set("repeatUntil", e.target.value)}
                      />
                    </Field>
                  )}
                </div>
                {preview &&
                  ("error" in preview ? (
                    <p className="text-[12px] text-danger-text">{preview.error}</p>
                  ) : (
                    <p className="text-[12px] text-muted">
                      <span className="font-medium text-ink">{describeRule(preview.rule)}</span> ·{" "}
                      <span className="tnum">{preview.count}</span> task
                      {preview.count === 1 ? "" : "s"} · {fmtDateMed(preview.first)}
                      {preview.count > 1 && <> → {fmtDateMed(preview.last)}</>}
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status" htmlFor="t-status">
            <Select
              id="t-status"
              value={form.status}
              onChange={(e) => set("status", e.target.value as TaskStatus)}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Points" hint="optional" htmlFor="t-points">
            <Input
              id="t-points"
              type="number"
              min={0}
              inputMode="numeric"
              value={form.points}
              placeholder="—"
              onChange={(e) => set("points", e.target.value)}
            />
          </Field>
        </div>

        {form.repeat === "none" && form.status !== "cancelled" && (
          <Checkbox
            checked={form.doneInClass}
            onChange={(v) => set("doneInClass", v)}
            label={
              <span>
                Done in class
                <span className="text-faint"> · finished during class, for the whole section</span>
              </span>
            }
          />
        )}

        {form.status === "cancelled" && (
          <Field
            label="Cancellation reason"
            hint="optional — shown on the cancelled task"
            htmlFor="t-cancel-reason"
          >
            <Textarea
              id="t-cancel-reason"
              rows={2}
              value={form.cancelReason}
              placeholder="e.g. Folded into next week's unit test."
              onChange={(e) => set("cancelReason", e.target.value)}
            />
          </Field>
        )}

        <Field label="Details" hint="coverage, format, what to bring" htmlFor="t-details">
          <Textarea
            id="t-details"
            rows={4}
            value={form.details}
            onChange={(e) => set("details", e.target.value)}
          />
        </Field>

        {/* materials */}
        <div className="space-y-1.5">
          <span className="flex items-baseline gap-1.5 text-[12px] font-medium text-muted">
            Materials
            <span className="font-normal text-faint">· links, PDFs, templates</span>
          </span>
          <div className="space-y-2">
            {form.links.map((link, i) => (
              <div key={i} className="flex items-center gap-2">
                {link.kind === "file" ? (
                  <FileText className="size-4 shrink-0 text-muted" aria-label="Uploaded file" />
                ) : (
                  <Link2 className="size-4 shrink-0 text-muted" aria-label="Link" />
                )}
                <Input
                  aria-label="Material label"
                  value={link.label}
                  placeholder="Label"
                  className="flex-1"
                  onChange={(e) => setLink(i, { label: e.target.value })}
                />
                <Input
                  aria-label="Material URL"
                  value={link.url}
                  placeholder="https://…"
                  disabled={link.kind === "file"}
                  className="flex-[1.4] font-mono text-[12px]"
                  onChange={(e) => setLink(i, { url: e.target.value })}
                />
                <IconButton
                  aria-label="Remove material"
                  onClick={() =>
                    setForm((f) => ({ ...f, links: f.links.filter((_, j) => j !== i) }))
                  }
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            ))}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    links: [...f.links, { label: "", url: "", kind: "link" }],
                  }))
                }
              >
                <Plus className="size-3.5" />
                Add link
              </Button>
              <Button size="sm" variant="secondary" loading={uploading} onClick={() => fileRef.current?.click()}>
                <Upload className="size-3.5" />
                Upload file
              </Button>
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                aria-label="Upload a material file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
            </div>
          </div>
        </div>

        <Field
          label="Clarification note"
          hint="highlighted callout — “waiting for teacher's go signal”"
          htmlFor="t-note"
        >
          <Textarea
            id="t-note"
            rows={2}
            value={form.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </Field>

        <Field
          label="Originally due"
          hint="set to show the moved badge (old → new date)"
          htmlFor="t-moved"
        >
          <Input
            id="t-moved"
            type="date"
            value={form.movedFrom}
            onChange={(e) => set("movedFrom", e.target.value)}
          />
        </Field>
      </div>
    </Panel>
  );
}
