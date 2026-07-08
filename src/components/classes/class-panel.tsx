"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import type { PeriodFull, SubjectFull, TaskFull } from "@/lib/domain/types";
import { DAY_NAMES, dueLabel, fmtDuration, fmtMin } from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { useNow } from "@/hooks/use-now";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { HueBadge, InfoFlag, WarnFlag } from "@/components/ui/badge";

function Property({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="w-[72px] shrink-0 text-[12px] text-faint">{label}</dt>
      <dd className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-ink">{children}</dd>
    </div>
  );
}

export function ClassPanel({
  subject,
  meetings,
  tasks,
  open,
  onClose,
  onEdit,
  nowISO,
}: {
  subject: SubjectFull | null;
  meetings: PeriodFull[];
  tasks: TaskFull[];
  open: boolean;
  onClose: () => void;
  onEdit?: (subject: SubjectFull) => void;
  nowISO: string;
}) {
  const router = useRouter();
  const now = useNow(nowISO, 60_000);

  // The Panel plays its own exit animation on close. The callers clear the
  // selected subject the moment they close, which would blank this content
  // and skip that animation — so retain the last shown subject (and its
  // meetings/tasks) and render from that snapshot while it animates out.
  const [snap, setSnap] = useState(
    subject ? { subject, meetings, tasks } : null
  );
  useEffect(() => {
    if (subject) setSnap({ subject, meetings, tasks });
  }, [subject, meetings, tasks]);

  const view = subject ? { subject, meetings, tasks } : snap;
  if (!view) return null;
  const { subject: shown, meetings: shownMeetings, tasks: shownTasks } = view;

  const weeklyMinutes = shownMeetings.reduce((sum, m) => sum + (m.end - m.start), 0);
  const openTasks = shownTasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled" && !t.doneInClass
  );

  return (
    <Panel
      open={open}
      onClose={onClose}
      modal={false}
      title={
        <span className="flex items-center gap-2">
          <span style={accentStyle(shown.hue)} className="a-dot size-2.5 rounded-[3.5px]" />
          {shown.name}
        </span>
      }
      description={
        <span className="font-mono text-[11.5px]">
          {shown.short}
          <span className="font-sans">
            {" · "}
            {shown.strand ? `${shown.strand} major` : "core — every strand"}
          </span>
        </span>
      }
      footer={
        onEdit ? (
          <Button variant="primary" onClick={() => onEdit(shown)}>
            <Pencil className="size-3.5" />
            Edit subject
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <dl className="space-y-2.5">
          <Property label="Teacher">
            <span className="truncate">{shown.teacher?.name ?? "—"}</span>
          </Property>
          {shown.teacher?.note && (
            <Property label="Note">
              <span className="truncate text-muted">{shown.teacher.note}</span>
            </Property>
          )}
          <Property label="Room">
            <span className="tnum font-mono text-[12.5px]">{shown.room ?? "—"}</span>
          </Property>
          <Property label="Load">
            <span className="tnum font-mono text-[12.5px]">
              {shownMeetings.length}×/week · {fmtDuration(weeklyMinutes)}
            </span>
          </Property>
        </dl>

        <section>
          <h3 className="mb-1.5 text-[11px] font-medium text-muted">Meetings</h3>
          {shownMeetings.length === 0 ? (
            <p className="text-[12.5px] text-faint">Not on the weekly schedule.</p>
          ) : (
            <ul className="divide-y divide-line/60 rounded-[var(--r-card)] border border-line">
              {shownMeetings.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-[76px] shrink-0 text-[12.5px] font-medium text-ink">
                    {DAY_NAMES[m.day]}
                  </span>
                  <span className="tnum font-mono text-[12px] text-muted">
                    {fmtMin(m.start)}–{fmtMin(m.end)}
                  </span>
                  <span className="tnum ml-auto font-mono text-[11px] text-faint">
                    {fmtDuration(m.end - m.start)}
                  </span>
                  {m.strand && (
                    <span className="rounded-[4px] bg-surface-2 px-1 font-mono text-[10px] font-semibold text-muted">
                      {m.strand}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="mb-1.5 flex items-baseline gap-2 text-[11px] font-medium text-muted">
            Open requirements
            <span className="tnum font-mono text-[10.5px] text-faint">{openTasks.length}</span>
          </h3>
          {openTasks.length === 0 ? (
            <p className="text-[12.5px] text-faint">Nothing due for this subject.</p>
          ) : (
            <ul className="space-y-1">
              {openTasks.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      router.push(`/tasks?task=${t.id}`);
                    }}
                    className="flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left transition-colors duration-[var(--dur-1)] hover:bg-surface focus-visible:bg-surface-2 focus-visible:outline-none active:scale-[0.99]"
                  >
                    <HueBadge hue={t.type.hue} className="w-10 justify-center">
                      {t.type.short}
                    </HueBadge>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
                      {t.title}
                    </span>
                    {t.heldInClass && <InfoFlag>In class</InfoFlag>}
                    {(t.movedFrom || t.status === "tentative") && (
                      <WarnFlag>{t.movedFrom ? "Moved" : "Unconfirmed"}</WarnFlag>
                    )}
                    <span className="tnum shrink-0 font-mono text-[11px] text-muted">
                      {dueLabel(t.dueDate, now)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Panel>
  );
}
