"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createPeriod, deletePeriod, updatePeriod, type PeriodInput } from "@/actions/periods";
import type { PeriodFull, PeriodKind, Strand, SubjectFull, Teacher } from "@/lib/domain/types";
import { DAY_SHORT, inputToMin, minToInput } from "@/lib/domain/time";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

const KIND_LABEL: Record<PeriodKind, string> = {
  class: "Class — a subject meets",
  break: "Break — recess, lunch",
  fixture: "Fixture — assembly, cleaning, SSG",
};

interface FormState {
  day: number;
  start: string;
  end: string;
  kind: PeriodKind;
  label: string;
  subjectId: number | "";
  teacherId: number | "";
  strand: string;
}

function initial(period: PeriodFull | null, defaultDay: number): FormState {
  if (period) {
    return {
      day: period.day,
      start: minToInput(period.start),
      end: minToInput(period.end),
      kind: period.kind,
      label: period.label ?? "",
      subjectId: period.subjectId ?? "",
      teacherId: period.teacherId ?? "",
      strand: period.strand ?? "",
    };
  }
  return {
    day: defaultDay,
    start: "07:45",
    end: "09:15",
    kind: "class",
    label: "",
    subjectId: "",
    teacherId: "",
    strand: "",
  };
}

export function PeriodEditor({
  period,
  defaultDay,
  subjects,
  teachers,
  strands,
  open,
  onClose,
}: {
  period: PeriodFull | null;
  defaultDay: number;
  subjects: SubjectFull[];
  teachers: Teacher[];
  strands: Strand[];
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState>(() => initial(period, defaultDay));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial(period, defaultDay));
      setError(null);
    }
  }, [open, period, defaultDay]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    const startMin = inputToMin(form.start);
    const endMin = inputToMin(form.end);
    if (startMin === null || endMin === null) return setError("Start and end times are required.");
    if (endMin <= startMin) return setError("End time must be after the start time.");
    if (form.kind === "class" && form.subjectId === "") return setError("Pick a subject.");
    if (form.kind !== "class" && !form.label.trim())
      return setError("Give the break/fixture a label.");
    setError(null);

    const input: PeriodInput = {
      day: form.day,
      start: startMin,
      end: endMin,
      kind: form.kind,
      label: form.label || null,
      subjectId: form.subjectId === "" ? null : Number(form.subjectId),
      teacherId: form.teacherId === "" ? null : Number(form.teacherId),
      strand: form.strand || null,
    };

    start(async () => {
      const res = period ? await updatePeriod(period.id, input) : await createPeriod(input);
      if (res.ok) {
        toast.success(period ? "Period updated" : "Period added");
        onClose();
      } else setError(res.error);
    });
  }

  async function remove() {
    if (!period) return;
    const yes = await confirm({
      title: "Delete this period?",
      description: "It disappears from the schedule for everyone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await deletePeriod(period.id);
      if (res.ok) {
        toast.success("Period deleted");
        onClose();
      } else toast.error(res.error);
    });
  }

  return (
    <Panel
      open={open}
      onClose={onClose}
      wide
      title={period ? "Edit period" : "New period"}
      description={`${DAY_SHORT[form.day]} · ${form.start || "—"}–${form.end || "—"}`}
      footer={
        <>
          {period && (
            <Button variant="danger" className="mr-auto" loading={pending} onClick={remove}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          )}
          {error && <p className="text-[12px] text-danger-text">{error}</p>}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} onClick={submit}>
            {period ? "Save changes" : "Add period"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Day">
          <Segmented
            ariaLabel="Day of the week"
            options={[1, 2, 3, 4, 5].map((d) => ({ value: d, label: DAY_SHORT[d] }))}
            value={form.day}
            onChange={(d) => set("day", d)}
            className="w-full"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" required htmlFor="p-start">
            <Input
              id="p-start"
              type="time"
              value={form.start}
              onChange={(e) => set("start", e.target.value)}
            />
          </Field>
          <Field label="Ends" required htmlFor="p-end">
            <Input
              id="p-end"
              type="time"
              value={form.end}
              onChange={(e) => set("end", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Kind" htmlFor="p-kind">
          <Select
            id="p-kind"
            value={form.kind}
            onChange={(e) => set("kind", e.target.value as PeriodKind)}
          >
            {(Object.keys(KIND_LABEL) as PeriodKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>

        {form.kind === "class" ? (
          <>
            <Field label="Subject" required htmlFor="p-subject">
              <Select
                id="p-subject"
                value={form.subjectId}
                onChange={(e) =>
                  set("subjectId", e.target.value === "" ? "" : Number(e.target.value))
                }
              >
                <option value="">Pick a subject…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.short} — {s.name}
                    {s.strand ? ` (${s.strand})` : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Teacher override"
              hint="only for this meeting — else the subject's teacher"
              htmlFor="p-teacher"
            >
              <Select
                id="p-teacher"
                value={form.teacherId}
                onChange={(e) =>
                  set("teacherId", e.target.value === "" ? "" : Number(e.target.value))
                }
              >
                <option value="">Subject&apos;s teacher</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : (
          <Field label="Label" required htmlFor="p-label">
            <Input
              id="p-label"
              value={form.label}
              placeholder="e.g. Lunch Break"
              onChange={(e) => set("label", e.target.value)}
            />
          </Field>
        )}

        <Field label="Strand" hint="empty = every strand attends" htmlFor="p-strand">
          <Select id="p-strand" value={form.strand} onChange={(e) => set("strand", e.target.value)}>
            <option value="">All strands</option>
            {strands.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} only
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Panel>
  );
}
