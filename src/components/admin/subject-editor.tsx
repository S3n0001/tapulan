"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createSubject, deleteSubject, updateSubject, type SubjectInput } from "@/actions/subjects";
import type { Strand, SubjectFull, Teacher } from "@/lib/domain/types";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { HueSelect } from "@/components/ui/hue-select";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

interface FormState {
  name: string;
  short: string;
  teacherId: number | "";
  strand: string;
  hue: string;
  room: string;
}

function initial(subject: SubjectFull | null): FormState {
  if (subject) {
    return {
      name: subject.name,
      short: subject.short,
      teacherId: subject.teacherId ?? "",
      strand: subject.strand ?? "",
      hue: subject.hue,
      room: subject.room ?? "",
    };
  }
  return { name: "", short: "", teacherId: "", strand: "", hue: "blue", room: "" };
}

export function SubjectEditor({
  subject,
  teachers,
  strands,
  open,
  onClose,
}: {
  subject: SubjectFull | null;
  teachers: Teacher[];
  strands: Strand[];
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState>(() => initial(subject));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(initial(subject));
      setError(null);
    }
  }, [open, subject]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function submit() {
    if (!form.name.trim()) return setError("Subject name is required.");
    if (!form.short.trim()) return setError("Add a short code (e.g. PHYSICS).");
    setError(null);

    const input: SubjectInput = {
      name: form.name,
      short: form.short,
      teacherId: form.teacherId === "" ? null : Number(form.teacherId),
      strand: form.strand || null,
      hue: form.hue,
      room: form.room || null,
    };

    start(async () => {
      const res = subject ? await updateSubject(subject.id, input) : await createSubject(input);
      if (res.ok) {
        toast.success(subject ? "Subject updated" : "Subject added");
        onClose();
      } else {
        setError(res.error);
      }
    });
  }

  async function remove() {
    if (!subject) return;
    const yes = await confirm({
      title: `Delete ${subject.short}?`,
      description:
        "Every period and task attached to this subject is deleted with it, for everyone. This can't be undone.",
      confirmLabel: "Delete subject",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await deleteSubject(subject.id);
      if (res.ok) {
        toast.success("Subject deleted");
        onClose();
      } else toast.error(res.error);
    });
  }

  return (
    <Panel
      onCmdEnter={submit}
      open={open}
      onClose={onClose}
      wide
      title={subject ? `Edit ${subject.short}` : "New subject"}
      description={subject ? subject.name : "Add a subject to the section's catalog"}
      footer={
        <>
          {subject && (
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
            {subject ? "Save changes" : "Add subject"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required htmlFor="s-name">
          <Input
            id="s-name"
            value={form.name}
            data-autofocus
            placeholder="e.g. General Physics 1"
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Short code" required hint="shown everywhere" htmlFor="s-short">
            <Input
              id="s-short"
              value={form.short}
              placeholder="PHYSICS"
              className="font-mono uppercase"
              onChange={(e) => set("short", e.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Room" hint="optional" htmlFor="s-room">
            <Input
              id="s-room"
              value={form.room}
              placeholder="Rm 204"
              onChange={(e) => set("room", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Teacher" htmlFor="s-teacher">
            <Select<string>
              id="s-teacher"
              ariaLabel="Teacher"
              align="start"
              className="w-full"
              value={String(form.teacherId)}
              onChange={(v) => set("teacherId", v === "" ? "" : Number(v))}
              options={[
                { value: "", label: "No teacher" },
                ...teachers.map((t) => ({ value: String(t.id), label: t.name })),
              ]}
            />
          </Field>
          <Field label="Strand" hint="empty = core, taken by all" htmlFor="s-strand">
            <Select<string>
              id="s-strand"
              ariaLabel="Strand"
              align="start"
              className="w-full"
              value={form.strand}
              onChange={(v) => set("strand", v)}
              options={[
                { value: "", label: "Core", hint: "every strand" },
                ...strands.map((s) => ({
                  value: s.code,
                  label: (
                    <span className="font-mono text-[12.5px] font-semibold">{s.code}</span>
                  ),
                  hint: s.name,
                  hue: s.hue,
                })),
              ]}
            />
          </Field>
        </div>

        <Field label="Color" hint="binds this subject's hue across the app">
          <HueSelect value={form.hue} onChange={(hue) => set("hue", hue)} />
        </Field>
      </div>
    </Panel>
  );
}
