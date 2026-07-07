"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, LogOut } from "lucide-react";
import { login, logout } from "@/actions/admin";
import type { ApiToken } from "@/lib/auth/tokens";
import type {
  DayMark,
  PeriodFull,
  Settings,
  Strand,
  SubjectFull,
  TaskFull,
  TaskType,
  Teacher,
} from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Toolbar } from "@/components/shell/toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { TasksView } from "@/components/tasks/tasks-view";
import { ScheduleTab } from "./schedule-tab";
import { SubjectsTab } from "./subjects-tab";
import { SettingsTab } from "./settings-tab";

/* ----------------------------------------------------------------- login */

export function AdminLogin() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!password) return;
    start(async () => {
      const res = await login(password);
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
        setPassword("");
      }
    });
  }

  return (
    <div className="anim-view">
      <Toolbar title="Admin" />
      <div className="mx-auto flex w-full max-w-[300px] flex-col items-center px-4 pt-[16vh] text-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--r-card)] border border-line bg-surface text-muted">
          <Lock className="size-4.5" strokeWidth={1.75} />
        </div>
        <h2 className="mt-3 text-[15px] font-semibold tracking-[-0.01em] text-ink">
          Admin access
        </h2>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          One shared password for the people who keep this accurate.
        </p>
        <form
          className="mt-5 w-full space-y-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            type="password"
            value={password}
            autoFocus
            placeholder="Password"
            aria-label="Admin password"
            autoComplete="current-password"
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
          />
          {error && <p className="text-left text-[12px] text-danger-text">{error}</p>}
          <Button
            type="submit"
            variant="primary"
            loading={pending}
            disabled={!password}
            className="w-full"
          >
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- dashboard */

type TabId = "tasks" | "schedule" | "subjects" | "settings";

const TABS: { id: TabId; label: string }[] = [
  { id: "tasks", label: "Tasks" },
  { id: "schedule", label: "Schedule" },
  { id: "subjects", label: "Subjects" },
  { id: "settings", label: "Settings" },
];

export function AdminDashboard({
  nowISO,
  tasks,
  subjects,
  types,
  periods,
  teachers,
  strands,
  dayMarks,
  settings,
  counts,
  tokens,
}: {
  nowISO: string;
  tasks: TaskFull[];
  subjects: SubjectFull[];
  types: TaskType[];
  periods: PeriodFull[];
  teachers: Teacher[];
  strands: Strand[];
  dayMarks: DayMark[];
  settings: Settings;
  counts: { tasks: number; periods: number; subjects: number };
  tokens: ApiToken[];
}) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [tab, setTab] = useState<TabId>("tasks");

  function signOut() {
    start(async () => {
      const res = await logout();
      if (res.ok) toast.success("Signed out");
      else toast.error(res.error);
    });
  }

  return (
    <div className="anim-view">
      <Toolbar
        title="Admin"
        meta={
          <span className="flex items-center gap-1.5 font-sans">
            <span className="size-1.5 rounded-full bg-ok" aria-hidden />
            live for the whole section
          </span>
        }
        right={
          <Button size="sm" variant="ghost" loading={pending} onClick={signOut}>
            <LogOut className="size-3.5" />
            Sign out
          </Button>
        }
      >
        <div
          role="tablist"
          aria-label="Admin sections"
          className="flex items-center gap-1 overflow-x-auto px-2 no-scrollbar lg:px-2.5"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative shrink-0 px-2 pb-2.5 pt-1 text-[13px] font-medium transition-colors duration-[var(--dur-1)]",
                  active ? "text-ink" : "text-muted hover:text-ink"
                )}
              >
                {t.label}
                {active && (
                  <span className="anim-underline absolute inset-x-1.5 bottom-0 h-[2px] rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>
      </Toolbar>

      <div key={tab} className="anim-fade">
        {tab === "tasks" && (
          <TasksView tasks={tasks} subjects={subjects} types={types} nowISO={nowISO} embedded />
        )}
        {tab === "schedule" && (
          <ScheduleTab
            periods={periods}
            subjects={subjects}
            teachers={teachers}
            strands={strands}
            dayMarks={dayMarks}
          />
        )}
        {tab === "subjects" && (
          <SubjectsTab subjects={subjects} teachers={teachers} strands={strands} />
        )}
        {tab === "settings" && <SettingsTab settings={settings} counts={counts} tokens={tokens} />}
      </div>
    </div>
  );
}
