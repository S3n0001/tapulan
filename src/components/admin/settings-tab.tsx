"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Download, KeyRound, RotateCcw, Upload } from "lucide-react";
import { changePassword, updateSettings } from "@/actions/admin";
import { getBackup, importBackup, resetToSeed } from "@/actions/backup";
import type { Settings } from "@/lib/domain/types";
import { toISODate } from "@/lib/domain/time";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-line px-3.5 py-4 last:border-b-0 lg:px-4">
      <h3 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">
        {title}
      </h3>
      {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
      <div className="mt-3 max-w-[420px]">{children}</div>
    </section>
  );
}

export function SettingsTab({
  settings,
  counts,
}: {
  settings: Settings;
  counts: { tasks: number; periods: number; subjects: number };
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const [sectionName, setSectionName] = useState(settings.sectionName);
  const [schoolYear, setSchoolYear] = useState(settings.schoolYear);
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  function saveIdentity() {
    start(async () => {
      const res = await updateSettings({ sectionName, schoolYear });
      if (res.ok) toast.success("Section details saved");
      else toast.error(res.error);
    });
  }

  function savePassword() {
    start(async () => {
      const res = await changePassword(currentPw, nextPw);
      if (res.ok) {
        toast.success("Password changed");
        setCurrentPw("");
        setNextPw("");
      } else toast.error(res.error);
    });
  }

  function exportBackup() {
    start(async () => {
      const res = await getBackup();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const blob = new Blob([res.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tapulan-backup-${toISODate(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    });
  }

  async function runImport(file: File) {
    const text = await file.text();
    const yes = await confirm({
      title: "Replace everything with this backup?",
      description:
        "All current subjects, periods, and tasks are replaced by the file's contents. Settings and the password stay.",
      confirmLabel: "Import",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await importBackup(text);
      if (res.ok) toast.success("Backup imported");
      else toast.error(res.error);
    });
  }

  async function runReset() {
    const one = await confirm({
      title: "Reset to the printed program?",
      description:
        "Every task, subject, period, and teacher goes back to the original seed. Anything added since is lost.",
      confirmLabel: "Continue",
      danger: true,
    });
    if (!one) return;
    const two = await confirm({
      title: "Really reset everything?",
      description: "Last check — this cannot be undone. Export a backup first if unsure.",
      confirmLabel: "Reset everything",
      danger: true,
    });
    if (!two) return;
    start(async () => {
      const res = await resetToSeed();
      if (res.ok) toast.success("Reset to seed");
      else toast.error(res.error);
    });
  }

  return (
    <div>
      <Section title="Section" hint="Shown in the sidebar — the app's only identity line.">
        <div className="space-y-3">
          <Field label="Section name" htmlFor="set-name">
            <Input
              id="set-name"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
            />
          </Field>
          <Field label="School year" htmlFor="set-year">
            <Input
              id="set-year"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Button size="sm" variant="primary" loading={pending} onClick={saveIdentity}>
              Save
            </Button>
          </div>
        </div>
      </Section>

      <Section title="Password" hint="One shared password for everyone who edits.">
        <div className="space-y-3">
          <Field label="Current password" htmlFor="set-pw-current">
            <Input
              id="set-pw-current"
              type="password"
              autoComplete="current-password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
            />
          </Field>
          <Field label="New password" hint="4+ characters" htmlFor="set-pw-next">
            <Input
              id="set-pw-next"
              type="password"
              autoComplete="new-password"
              value={nextPw}
              onChange={(e) => setNextPw(e.target.value)}
            />
          </Field>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="primary"
              loading={pending}
              disabled={!currentPw || !nextPw}
              onClick={savePassword}
            >
              <KeyRound className="size-3.5" />
              Change password
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="Data"
        hint={`${counts.tasks} tasks · ${counts.periods} periods · ${counts.subjects} subjects. Backups cover the database, not uploaded files.`}
      >
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" loading={pending} onClick={exportBackup}>
            <Download className="size-3.5" />
            Export backup
          </Button>
          <Button size="sm" variant="secondary" onClick={() => importRef.current?.click()}>
            <Upload className="size-3.5" />
            Import backup
          </Button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-label="Import a backup file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void runImport(file);
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="danger" loading={pending} onClick={runReset}>
            <RotateCcw className="size-3.5" />
            Reset to seed
          </Button>
        </div>
      </Section>
    </div>
  );
}
