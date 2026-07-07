"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDayMark, saveDayMark, type DayMarkInput } from "@/actions/day-marks";
import { DAY_MARK_BLURB } from "@/lib/domain/day-mark";
import type { DayMark, DayMarkKind } from "@/lib/domain/types";
import { fmtDateMed, isISODate } from "@/lib/domain/time";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

interface FormState {
  date: string;
  kind: DayMarkKind;
  label: string;
  note: string;
}

function initial(mark: DayMark | null, defaultDate: string): FormState {
  if (mark) {
    return { date: mark.date, kind: mark.kind, label: mark.label ?? "", note: mark.note ?? "" };
  }
  return { date: defaultDate, kind: "async", label: "", note: "" };
}

/** Add or edit one calendar override (async / no-class) for a single date. */
export function DayMarkEditor({
  mark,
  defaultDate,
  open,
  onClose,
}: {
  mark: DayMark | null;
  defaultDate: string;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState>(() => initial(mark, defaultDate));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial(mark, defaultDate));
      setError(null);
    }
  }, [open, mark, defaultDate]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    if (!isISODate(form.date)) return setError("Pick a valid date.");
    setError(null);

    const input: DayMarkInput = {
      date: form.date,
      kind: form.kind,
      label: form.label.trim() || null,
      note: form.note.trim() || null,
    };

    start(async () => {
      const res = await saveDayMark(mark?.date ?? null, input);
      if (res.ok) {
        toast.success(mark ? "Day updated" : "Day marked");
        onClose();
      } else setError(res.error);
    });
  }

  async function remove() {
    if (!mark) return;
    const yes = await confirm({
      title: "Remove this day?",
      description: "The date goes back to its normal schedule for everyone.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await deleteDayMark(mark.date);
      if (res.ok) {
        toast.success("Day removed");
        onClose();
      } else toast.error(res.error);
    });
  }

  return (
    <Panel
      open={open}
      onClose={onClose}
      onCmdEnter={submit}
      wide
      title={mark ? "Edit day" : "Mark a day"}
      description={isISODate(form.date) ? fmtDateMed(form.date) : "Async or no-class override"}
      footer={
        <>
          {mark && (
            <Button variant="danger" className="mr-auto" loading={pending} onClick={remove}>
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          )}
          {error && <p className="text-[12px] text-danger-text">{error}</p>}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" loading={pending} onClick={submit}>
            {mark ? "Save changes" : "Mark day"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Date" required htmlFor="dm-date">
          <Input
            id="dm-date"
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>

        <Field label="Kind">
          <Segmented<DayMarkKind>
            ariaLabel="Day kind"
            options={[
              { value: "async", label: "Async" },
              { value: "no_class", label: "No class" },
            ]}
            value={form.kind}
            onChange={(k) => set("kind", k)}
            className="w-full"
          />
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            {DAY_MARK_BLURB[form.kind]}
          </p>
        </Field>

        <Field label="Label" hint="optional — else the default name" htmlFor="dm-label">
          <Input
            id="dm-label"
            value={form.label}
            placeholder={form.kind === "async" ? "e.g. Modular week" : "e.g. Semestral break"}
            onChange={(e) => set("label", e.target.value)}
          />
        </Field>

        <Field label="Note" hint="optional — shown with the day" htmlFor="dm-note">
          <Textarea
            id="dm-note"
            value={form.note}
            placeholder={
              form.kind === "async"
                ? "e.g. Submit modules on Classroom by 5 PM."
                : "e.g. Holiday — Eid'l Adha."
            }
            onChange={(e) => set("note", e.target.value)}
          />
        </Field>
      </div>
    </Panel>
  );
}
