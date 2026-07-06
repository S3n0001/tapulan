"use client";

import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createTeacher, deleteTeacher, updateTeacher } from "@/actions/teachers";
import type { Teacher } from "@/lib/domain/types";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

export function TeacherEditor({
  teacher,
  open,
  onClose,
}: {
  teacher: Teacher | null;
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(teacher?.name ?? "");
      setNote(teacher?.note ?? "");
      setError(null);
    }
  }, [open, teacher]);

  function submit() {
    if (!name.trim()) return setError("Teacher name is required.");
    setError(null);
    const input = { name, note: note || null };
    start(async () => {
      const res = teacher ? await updateTeacher(teacher.id, input) : await createTeacher(input);
      if (res.ok) {
        toast.success(teacher ? "Teacher updated" : "Teacher added");
        onClose();
      } else setError(res.error);
    });
  }

  async function remove() {
    if (!teacher) return;
    const yes = await confirm({
      title: `Remove ${teacher.name}?`,
      description:
        "Subjects and periods keep working — they just lose the teacher reference.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await deleteTeacher(teacher.id);
      if (res.ok) {
        toast.success("Teacher removed");
        onClose();
      } else toast.error(res.error);
    });
  }

  return (
    <Panel
      open={open}
      onClose={onClose}
      title={teacher ? `Edit ${teacher.name}` : "New teacher"}
      description={teacher ? "Update the name or note" : "Add a teacher to assign to subjects"}
      footer={
        <>
          {teacher && (
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
            {teacher ? "Save changes" : "Add teacher"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required htmlFor="te-name">
          <Input
            id="te-name"
            value={name}
            data-autofocus
            placeholder="e.g. Mme. Patan"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Note" hint="optional — subject taught, quirks" htmlFor="te-note">
          <Input
            id="te-note"
            value={note}
            placeholder="e.g. FABM 2"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Panel>
  );
}
