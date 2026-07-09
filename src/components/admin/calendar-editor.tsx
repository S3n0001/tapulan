"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import {
  createCalendar,
  deleteCalendar,
  updateCalendar,
  type CalendarInput,
} from "@/actions/calendars";
import type { CalendarFull } from "@/lib/domain/types";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { HueSelect } from "@/components/ui/hue-select";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

interface FormState {
  name: string;
  subtitle: string;
  hue: string;
  published: boolean;
}

function initial(calendar: CalendarFull | null): FormState {
  if (calendar) {
    return {
      name: calendar.name,
      subtitle: calendar.subtitle ?? "",
      hue: calendar.hue,
      published: calendar.published,
    };
  }
  return { name: "", subtitle: "", hue: "blue", published: false };
}

/** Add or edit an individual calendar's identity (its blocks are edited inline). */
export function CalendarEditor({
  calendar,
  open,
  onClose,
}: {
  calendar: CalendarFull | null;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState>(() => initial(calendar));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial(calendar));
      setError(null);
    }
  }, [open, calendar]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    if (!form.name.trim()) return setError("Give the calendar a name.");
    setError(null);

    const input: CalendarInput = {
      name: form.name.trim(),
      subtitle: form.subtitle.trim() || null,
      hue: form.hue,
      published: form.published,
    };

    start(async () => {
      const res = calendar
        ? await updateCalendar(calendar.id, input)
        : await createCalendar(input);
      if (res.ok) {
        toast.success(calendar ? "Calendar updated" : "Calendar added");
        onClose();
      } else setError(res.error);
    });
  }

  async function remove() {
    if (!calendar) return;
    const yes = await confirm({
      title: `Delete “${calendar.name}”?`,
      description:
        "The calendar and all its blocks are removed. If it was visible, it disappears from everyone's Settings. This can't be undone.",
      confirmLabel: "Delete calendar",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await deleteCalendar(calendar.id);
      if (res.ok) {
        toast.success("Calendar deleted");
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
      title={calendar ? "Edit calendar" : "New calendar"}
      description={calendar ? calendar.name : "A personal weekly schedule"}
      footer={
        <>
          {calendar && (
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
            {calendar ? "Save changes" : "Add calendar"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required htmlFor="cal-name">
          <Input
            id="cal-name"
            value={form.name}
            data-autofocus
            placeholder="e.g. My work week, School schedule"
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        <Field label="Subtitle" hint="optional — whose or what it covers" htmlFor="cal-subtitle">
          <Input
            id="cal-subtitle"
            value={form.subtitle}
            placeholder="e.g. Sen · part-time"
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </Field>

        <Field label="Color" hint="binds this calendar's hue">
          <HueSelect value={form.hue} onChange={(hue) => set("hue", hue)} />
        </Field>

        <div className="rounded-[var(--r-card)] border border-line bg-surface/60 px-3 py-2.5">
          <Checkbox
            checked={form.published}
            onChange={(v) => set("published", v)}
            label="Visible to everyone"
          />
          <p className="mt-1.5 pl-[22px] text-[12px] leading-snug text-muted">
            When on, anyone can see this schedule under Settings → Personal schedules. Off keeps it
            an admin-only draft.
          </p>
        </div>
      </div>
    </Panel>
  );
}
