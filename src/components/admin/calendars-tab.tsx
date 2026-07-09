"use client";

import { useState } from "react";
import { CalendarClock, Eye, EyeOff, Pencil, Plus } from "lucide-react";
import type { CalendarBlock, CalendarFull } from "@/lib/domain/types";
import { blocksByDay, dayName, weeklyMinutes } from "@/lib/domain/calendar";
import { fmtDuration, fmtTimeRange } from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { cn } from "@/lib/utils";
import { useRetained } from "@/hooks/use-retained";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { CalendarEditor } from "./calendar-editor";
import { CalendarBlockEditor } from "./calendar-block-editor";

interface BlockEdit {
  calendarId: number;
  block: CalendarBlock | null;
  day: number;
}

/** The individual-calendars manager: a card per calendar, blocks edited inline. */
export function CalendarsTab({ calendars }: { calendars: CalendarFull[] }) {
  const [calEdit, setCalEdit] = useState<CalendarFull | "new" | null>(null);
  const [blockEdit, setBlockEdit] = useState<BlockEdit | null>(null);
  // keep the last-edited target mounted through each panel's close animation
  const shownCal = useRetained(calEdit);
  const shownBlock = useRetained(blockEdit);

  const total = calendars.length;

  return (
    <div>
      <div className="flex h-11 items-center gap-2 border-b border-line px-3.5 lg:px-4">
        <span className="tnum font-mono text-[12px] text-faint">
          {total} {total === 1 ? "calendar" : "calendars"} · personal schedules
        </span>
        <Button
          size="sm"
          variant="primary"
          className="ml-auto"
          onClick={() => setCalEdit("new")}
        >
          <Plus className="size-3.5" />
          New calendar
        </Button>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No individual calendars yet"
          action={
            <Button size="sm" variant="secondary" onClick={() => setCalEdit("new")}>
              <Plus className="size-3.5" />
              New calendar
            </Button>
          }
        >
          Add a personal weekly schedule — your work hours, someone&apos;s timetable, a duty rota.
          Mark it visible to share it with the whole section under Settings.
        </EmptyState>
      ) : (
        <div className="space-y-3 p-3.5 lg:p-4">
          {calendars.map((cal) => (
            <CalendarCard
              key={cal.id}
              calendar={cal}
              onEdit={() => setCalEdit(cal)}
              onAddBlock={(day) => setBlockEdit({ calendarId: cal.id, block: null, day })}
              onEditBlock={(block) =>
                setBlockEdit({ calendarId: cal.id, block, day: block.day })
              }
            />
          ))}
        </div>
      )}

      <CalendarEditor
        calendar={shownCal === null || shownCal === "new" ? null : shownCal}
        open={calEdit !== null}
        onClose={() => setCalEdit(null)}
      />

      <CalendarBlockEditor
        block={shownBlock?.block ?? null}
        calendarId={shownBlock?.calendarId ?? 0}
        defaultDay={shownBlock?.day ?? 1}
        open={blockEdit !== null}
        onClose={() => setBlockEdit(null)}
      />
    </div>
  );
}

/* --------------------------------------------------------------- card */

function CalendarCard({
  calendar,
  onEdit,
  onAddBlock,
  onEditBlock,
}: {
  calendar: CalendarFull;
  onEdit: () => void;
  onAddBlock: (day: number) => void;
  onEditBlock: (block: CalendarBlock) => void;
}) {
  const groups = blocksByDay(calendar.blocks);
  const minutes = weeklyMinutes(calendar.blocks);

  return (
    <section className="overflow-hidden rounded-[var(--r-card)] border border-line bg-surface/50">
      <header className="flex items-center gap-3 border-b border-line/70 px-3 py-2.5">
        <span
          style={accentStyle(calendar.hue)}
          className="a-dot size-2.5 shrink-0 rounded-full"
          aria-hidden
        />
        <button
          type="button"
          onClick={onEdit}
          className="group flex min-w-0 flex-1 items-center gap-2 text-left"
          aria-label={`Edit ${calendar.name}`}
        >
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[13.5px] font-semibold text-ink">
                {calendar.name}
              </span>
              <Pencil className="size-3 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
            {calendar.subtitle && (
              <span className="block truncate text-[12px] text-muted">{calendar.subtitle}</span>
            )}
          </span>
        </button>

        <VisibilityChip published={calendar.published} />

        <Button
          size="sm"
          variant="secondary"
          onClick={() => onAddBlock(1)}
          aria-label={`Add a block to ${calendar.name}`}
        >
          <Plus className="size-3.5" />
          Block
        </Button>
      </header>

      {calendar.blocks.length === 0 ? (
        <button
          type="button"
          onClick={() => onAddBlock(1)}
          className="flex w-full items-center justify-center gap-1.5 px-3 py-4 text-[12px] text-faint transition-colors hover:bg-surface/70 hover:text-ink"
        >
          <Plus className="size-3.5" />
          Add the first block — a time this repeats each week.
        </button>
      ) : (
        <>
          <ul className="divide-y divide-line/50">
            {groups.map((group) => (
              <li key={group.day} className="flex gap-3 px-3 py-2">
                <span className="w-[70px] shrink-0 pt-[3px] font-mono text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">
                  {dayName(group.day)}
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  {group.blocks.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => onEditBlock(block)}
                      className="tap group -mx-1.5 flex w-[calc(100%+0.75rem)] items-baseline gap-2.5 rounded-[6px] px-1.5 py-1 text-left transition-colors hover:bg-surface-2"
                    >
                      <span className="tnum w-[118px] shrink-0 font-mono text-[12px] text-ink">
                        {fmtTimeRange(block.start, block.end)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                        {block.label}
                        {block.note && (
                          <span className="ml-1.5 font-normal text-muted">· {block.note}</span>
                        )}
                      </span>
                      <Pencil className="size-3 shrink-0 self-center text-faint opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2 border-t border-line/60 px-3 py-1.5">
            <span className="tnum font-mono text-[10.5px] text-faint">
              {calendar.blocks.length} {calendar.blocks.length === 1 ? "block" : "blocks"} ·{" "}
              {fmtDuration(minutes)}/wk
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function VisibilityChip({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "hidden shrink-0 items-center gap-1 rounded-[5px] px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-[0.04em] sm:inline-flex",
        published
          ? "bg-[color-mix(in_oklab,var(--brand)_14%,var(--bg))] text-brand-text"
          : "bg-surface-2 text-faint"
      )}
      title={
        published
          ? "Visible to everyone under Settings"
          : "Admin-only draft — not shown to the section"
      }
    >
      {published ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
      {published ? "Visible" : "Draft"}
    </span>
  );
}
