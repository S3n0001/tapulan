"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  createCalendarBlock,
  deleteCalendarBlock,
  updateCalendarBlock,
  type CalendarBlockInput,
} from "@/actions/calendars";
import type { CalendarBlock } from "@/lib/domain/types";
import { WEEK_DAYS_MON_FIRST, dayShort } from "@/lib/domain/calendar";
import { inputToMin, minToInput } from "@/lib/domain/time";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

interface FormState {
  day: number;
  start: string;
  end: string;
  label: string;
  note: string;
}

function initial(block: CalendarBlock | null, defaultDay: number): FormState {
  if (block) {
    return {
      day: block.day,
      start: minToInput(block.start),
      end: minToInput(block.end),
      label: block.label,
      note: block.note ?? "",
    };
  }
  return { day: defaultDay, start: "09:00", end: "17:00", label: "", note: "" };
}

/** Add or edit one recurring weekly block on an individual calendar. */
export function CalendarBlockEditor({
  block,
  calendarId,
  defaultDay,
  open,
  onClose,
}: {
  block: CalendarBlock | null;
  calendarId: number;
  defaultDay: number;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState>(() => initial(block, defaultDay));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial(block, defaultDay));
      setError(null);
    }
  }, [open, block, defaultDay]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    const startMin = inputToMin(form.start);
    const endMin = inputToMin(form.end);
    if (startMin === null || endMin === null) return setError("Start and end times are required.");
    if (endMin <= startMin) return setError("End time must be after the start time.");
    if (!form.label.trim()) return setError("Give the block a label (e.g. Work, Math).");
    setError(null);

    const input: CalendarBlockInput = {
      calendarId,
      day: form.day,
      start: startMin,
      end: endMin,
      label: form.label.trim(),
      note: form.note.trim() || null,
    };

    start(async () => {
      const res = block
        ? await updateCalendarBlock(block.id, input)
        : await createCalendarBlock(input);
      if (res.ok) {
        toast.success(block ? "Block updated" : "Block added");
        onClose();
      } else setError(res.error);
    });
  }

  async function remove() {
    if (!block) return;
    const yes = await confirm({
      title: "Delete this block?",
      description: "It disappears from this calendar.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await deleteCalendarBlock(block.id);
      if (res.ok) {
        toast.success("Block deleted");
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
      title={block ? "Edit block" : "New block"}
      description={`${dayShort(form.day)} · ${form.start || "—"}–${form.end || "—"}`}
      footer={
        <>
          {block && (
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
            {block ? "Save changes" : "Add block"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Day">
          <Segmented
            ariaLabel="Day of the week"
            options={WEEK_DAYS_MON_FIRST.map((d) => ({ value: d, label: dayShort(d) }))}
            value={form.day}
            onChange={(d) => set("day", d)}
            className="w-full"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts" required htmlFor="cb-start">
            <Input
              id="cb-start"
              type="time"
              value={form.start}
              onChange={(e) => set("start", e.target.value)}
            />
          </Field>
          <Field label="Ends" required htmlFor="cb-end">
            <Input
              id="cb-end"
              type="time"
              value={form.end}
              onChange={(e) => set("end", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Label" required hint="what this block is" htmlFor="cb-label">
          <Input
            id="cb-label"
            value={form.label}
            data-autofocus
            placeholder="e.g. Work, Math, Gym"
            onChange={(e) => set("label", e.target.value)}
          />
        </Field>

        <Field label="Note" hint="optional — a room, a detail" htmlFor="cb-note">
          <Textarea
            id="cb-note"
            value={form.note}
            placeholder="e.g. Front desk shift · bring uniform"
            onChange={(e) => set("note", e.target.value)}
          />
        </Field>
      </div>
    </Panel>
  );
}
