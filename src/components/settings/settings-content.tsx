"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { setStrand } from "@/actions/session";
import type { CalendarFull, Strand, StrandCode } from "@/lib/domain/types";
import { blocksByDay, dayShort } from "@/lib/domain/calendar";
import { fmtTimeRange } from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { usePrefs } from "@/hooks/use-prefs";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";

/**
 * The settings controls themselves, free of any surrounding chrome so they can
 * sit inside the modal ([[settings-modal]]) — everything here is device-local
 * (theme via next-themes, the rest via [[use-prefs]], the strand via a cookie
 * action). None of it touches the shared section data; section-wide settings
 * live behind the admin door.
 *
 * Inside the modal there is no bordered card per group — the modal *is* the
 * card, so a quiet mono label + light rows carry the grouping without nesting a
 * second box inside the first.
 */
export function SettingsContent({
  strands,
  current,
  calendars,
}: {
  strands: Strand[];
  current: StrandCode | null;
  /** published individual calendars — read-only, section-wide (not device-local) */
  calendars: CalendarFull[];
}) {
  const { prefs, setPref } = usePrefs();
  const { theme, setTheme } = useTheme();
  const [pending, startStrand] = useTransition();

  // next-themes reads localStorage on the client only; wait for mount so the
  // control shows the real value instead of flashing a wrong one on hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="space-y-6">
      <Group title="Appearance">
        <Row label="Theme" hint="System follows your device’s light / dark setting. Sepia is warm paper — light, in brown ink.">
          <Segmented<string>
            ariaLabel="Theme"
            value={mounted ? theme ?? "system" : "system"}
            onChange={setTheme}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "sepia", label: "Sepia" },
            ]}
          />
        </Row>
      </Group>

      <Group title="Home">
        <Row label="Due-soon window" hint="How far ahead the Today rail counts as “due soon”.">
          <Segmented<number>
            ariaLabel="Due-soon window"
            value={prefs.horizon}
            onChange={(v) => setPref("horizon", v as 7 | 14 | 30)}
            options={[
              { value: 7, label: "7 days" },
              { value: 14, label: "14 days" },
              { value: 30, label: "30 days" },
            ]}
          />
        </Row>
      </Group>

      <Group title="Tasks">
        <Row
          label="Done & cancelled"
          hint="Keep finished and called-off requirements in the list instead of hiding them."
        >
          <Segmented<number>
            ariaLabel="Show done and cancelled tasks"
            value={prefs.showDone ? 1 : 0}
            onChange={(v) => setPref("showDone", v === 1)}
            options={[
              { value: 0, label: "Hide" },
              { value: 1, label: "Show" },
            ]}
          />
        </Row>
        <Row
          label="Materials"
          hint="Open an attachment in a new tab, or preview it inside the app."
        >
          <Segmented<number>
            ariaLabel="Where materials open"
            value={prefs.materialsNewTab ? 1 : 0}
            onChange={(v) => setPref("materialsNewTab", v === 1)}
            options={[
              { value: 0, label: "In-app" },
              { value: 1, label: "New tab" },
            ]}
          />
        </Row>
      </Group>

      <Group title="Strand">
        <Row label="Viewing" hint="Which track’s schedule and split blocks you see.">
          <Select<string>
            ariaLabel="Strand"
            loading={pending}
            width={264}
            className="min-w-[9.5rem]"
            value={current ?? ""}
            onChange={(code) => startStrand(() => setStrand(code))}
            options={[
              { value: "", label: "Whole section", hint: "all strands" },
              ...strands.map((s) => ({
                value: s.code,
                label: <span className="font-mono text-[12.5px] font-semibold">{s.code}</span>,
                hint: s.name,
              })),
            ]}
          />
        </Row>
      </Group>

      <p className="px-2 text-[11.5px] leading-relaxed text-faint">
        These preferences are saved on this device only — they don’t change what anyone else in the
        section sees.
      </p>

      {calendars.length > 0 && (
        <Group
          title="Personal schedules"
          hint="Weekly calendars your section’s admins keep. Read-only here."
        >
          <div className="space-y-2.5 px-2 pt-0.5">
            {calendars.map((cal) => (
              <CalendarPeek key={cal.id} calendar={cal} />
            ))}
          </div>
        </Group>
      )}
    </div>
  );
}

/** One published individual calendar, read-only: its weekly blocks by day. */
function CalendarPeek({ calendar }: { calendar: CalendarFull }) {
  const groups = blocksByDay(calendar.blocks);
  return (
    <div className="overflow-hidden rounded-[var(--r-card)] border border-line bg-surface/50">
      <div className="flex items-center gap-2 border-b border-line/70 px-2.5 py-2">
        <span
          style={accentStyle(calendar.hue)}
          className="a-dot size-2 shrink-0 rounded-full"
          aria-hidden
        />
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-semibold text-ink">
            {calendar.name}
          </span>
          {calendar.subtitle && (
            <span className="block truncate text-[11.5px] text-muted">{calendar.subtitle}</span>
          )}
        </span>
      </div>
      {groups.length === 0 ? (
        <p className="px-2.5 py-2 text-[11.5px] text-faint">Nothing scheduled yet.</p>
      ) : (
        <ul className="divide-y divide-line/50">
          {groups.map((group) => (
            <li key={group.day} className="flex gap-2.5 px-2.5 py-1.5">
              <span className="w-[30px] shrink-0 pt-[2px] font-mono text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
                {dayShort(group.day)}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                {group.blocks.map((block) => (
                  <div key={block.id} className="flex items-baseline gap-2 text-[12px] leading-snug">
                    <span className="tnum shrink-0 font-mono text-muted">
                      {fmtTimeRange(block.start, block.end)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {block.label}
                      {block.note && <span className="text-muted"> · {block.note}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A labelled section: quiet mono label (+ optional hint) over its rows. */
function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 px-2">
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-muted">
          {title}
        </h2>
        {hint && <p className="mt-1 text-[12px] leading-snug text-faint">{hint}</p>}
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

/** Label + hint on the left, a control on the right; stacks on narrow screens. */
function Row({ label, hint, children }: { label: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 px-2 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-ink">{label}</div>
        {hint && <p className="mt-0.5 text-[12px] leading-snug text-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
