"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { Copy, Download, KeyRound, Plus, RotateCcw, Terminal, Trash2, Upload } from "lucide-react";
import { changePassword, updateSettings } from "@/actions/admin";
import { getBackup, importBackup, resetToSeed } from "@/actions/backup";
import { createCliToken, revokeCliToken } from "@/actions/tokens";
import type { ApiToken } from "@/lib/auth/tokens";
import type { Settings } from "@/lib/domain/types";
import { fmtDateShort, toISODate } from "@/lib/domain/time";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
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
      <h3 className="text-[11px] font-medium text-muted">{title}</h3>
      {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
      <div className="mt-3 max-w-[420px]">{children}</div>
    </section>
  );
}

export function SettingsTab({
  settings,
  counts,
  tokens,
}: {
  settings: Settings;
  counts: { tasks: number; periods: number; subjects: number };
  tokens: ApiToken[];
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const [sectionName, setSectionName] = useState(settings.sectionName);
  const [schoolYear, setSchoolYear] = useState(settings.schoolYear);
  const [currentPw, setCurrentPw] = useState("");
  const [nextPw, setNextPw] = useState("");
  const [tokenLabel, setTokenLabel] = useState("");
  const [minted, setMinted] = useState<{ id: number; token: string } | null>(null);
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

  function mintToken() {
    start(async () => {
      const res = await createCliToken(tokenLabel);
      if (res.ok) {
        setMinted({ id: res.data.meta.id, token: res.data.token });
        setTokenLabel("");
        toast.success("Token created — copy it now");
      } else toast.error(res.error);
    });
  }

  async function copyMinted() {
    if (!minted) return;
    try {
      await navigator.clipboard.writeText(minted.token);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy — select the token manually.");
    }
  }

  async function runRevoke(token: ApiToken) {
    const yes = await confirm({
      title: `Revoke “${token.label}”?`,
      description:
        "That terminal stops working immediately. Pair it again anytime with `tapulan login`.",
      confirmLabel: "Revoke",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await revokeCliToken(token.id);
      if (res.ok) {
        if (minted?.id === token.id) setMinted(null);
        toast.success("Token revoked");
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
        title="CLI access"
        hint="Post tasks from a terminal — `tapulan login` pairs a machine and lists its token here."
      >
        <div className="space-y-3">
          {minted && (
            <div className="rounded-[var(--r-card)] border border-[color-mix(in_oklab,var(--warn)_45%,var(--line))] bg-[color-mix(in_oklab,var(--warn)_9%,var(--surface))] p-2.5">
              <p className="text-[12px] font-medium text-warn-text">
                Copy this token now — it won&apos;t be shown again.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  readOnly
                  aria-label="New CLI token"
                  value={minted.token}
                  className="flex-1 font-mono text-[12px]"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button variant="secondary" onClick={copyMinted}>
                  <Copy className="size-3.5" />
                  Copy
                </Button>
              </div>
            </div>
          )}

          {tokens.length === 0 ? (
            <p className="text-[12px] text-faint">
              No tokens yet — create one here, or run <code className="font-mono">tapulan login</code> from
              a terminal.
            </p>
          ) : (
            <ul className="divide-y divide-line/70 rounded-[var(--r-card)] border border-line">
              {tokens.map((t) => (
                <li key={t.id} className="flex items-center gap-2.5 px-2.5 py-2">
                  <Terminal className="size-3.5 shrink-0 text-faint" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">
                      {t.label}
                    </span>
                    <span className="tnum block font-mono text-[10.5px] text-faint">
                      created {fmtDateShort(t.createdAt.slice(0, 10))} ·{" "}
                      {t.lastUsedAt
                        ? `last used ${fmtDateShort(t.lastUsedAt.slice(0, 10))}`
                        : "never used"}
                    </span>
                  </span>
                  <IconButton aria-label={`Revoke ${t.label}`} onClick={() => runRevoke(t)}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <Input
              aria-label="New token label"
              value={tokenLabel}
              placeholder="Label — e.g. Ana's laptop"
              className="flex-1"
              onChange={(e) => setTokenLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tokenLabel.trim()) mintToken();
              }}
            />
            <Button
              variant="secondary"
              loading={pending}
              disabled={!tokenLabel.trim()}
              onClick={mintToken}
            >
              <Plus className="size-3.5" />
              Create token
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
