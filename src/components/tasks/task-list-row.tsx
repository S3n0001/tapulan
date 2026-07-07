"use client";

import { Paperclip } from "lucide-react";
import type { TaskFull } from "@/lib/domain/types";
import { dueLabel, dueTone, type DueTone } from "@/lib/domain/time";
import { accentStyle } from "@/lib/domain/hues";
import { cn } from "@/lib/utils";
import { HueBadge, MutedFlag, WarnFlag } from "@/components/ui/badge";
import { DoneCheck } from "./done-check";

const TONE_TEXT: Record<DueTone, string> = {
  danger: "text-danger-text",
  warn: "text-warn-text",
  soon: "text-ink",
  normal: "text-muted",
};

/**
 * One requirement, one line (two on mobile). Fixed column widths keep the
 * whole list grid-aligned like an issue tracker, not a card pile.
 */
export function TaskListRow({
  task,
  now,
  done,
  selected = false,
  onToggleDone,
  onOpen,
  showSubject = true,
}: {
  task: TaskFull;
  now: Date;
  done: boolean;
  selected?: boolean;
  onToggleDone: () => void;
  onOpen: () => void;
  showSubject?: boolean;
}) {
  const cancelled = task.status === "cancelled";
  const complete = done || task.status === "done";
  const tone: DueTone = complete || cancelled ? "normal" : dueTone(task.dueDate, now, task.dueTime);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 px-3.5 py-2 transition-colors duration-[var(--dur-1)] lg:h-9 lg:items-center lg:px-4 lg:py-0",
        selected ? "bg-surface-2" : "hover:bg-surface/70"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0 inset-y-0 w-[2px] bg-brand transition-opacity duration-[var(--dur-1)]",
          selected ? "opacity-100" : "opacity-0"
        )}
      />
      <DoneCheck done={done} onToggle={onToggleDone} />
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-[6px] text-left transition-transform active:scale-[0.99] focus-visible:bg-surface-2 focus-visible:outline-none lg:flex-nowrap"
      >
        <HueBadge hue={task.type.hue} className="w-11 justify-center">
          {task.type.short}
        </HueBadge>

        <span className="flex min-w-0 flex-[1_1_55%] items-center gap-2 lg:flex-1">
          <span
            className={cn(
              "min-w-0 truncate text-[13px] font-medium leading-snug text-ink",
              complete && "text-muted line-through decoration-1",
              cancelled && "text-faint line-through decoration-1"
            )}
          >
            {task.title}
          </span>
          {task.links.length > 0 && (
            <Paperclip className="size-3 shrink-0 text-faint" aria-label="Has materials" />
          )}
          {cancelled ? (
            <span title={task.cancelReason ?? undefined}>
              <MutedFlag>cancelled</MutedFlag>
            </span>
          ) : (
            <>
              {task.movedFrom && <WarnFlag>moved</WarnFlag>}
              {task.status === "tentative" && <WarnFlag>unconfirmed</WarnFlag>}
            </>
          )}
        </span>

        <span className="flex w-full items-center gap-3 pl-[56px] lg:w-auto lg:pl-0">
          {showSubject && (
            <span
              style={accentStyle(task.subject.hue)}
              className="flex w-16 items-center gap-1.5 lg:justify-end"
            >
              <span className="a-dot size-1.5 shrink-0 rounded-full" />
              <span className="truncate font-mono text-[11px] font-medium text-muted">
                {task.subject.short}
              </span>
            </span>
          )}
          <span className="tnum hidden w-10 text-right font-mono text-[11px] text-faint sm:block">
            {task.points !== null ? `${task.points}p` : ""}
          </span>
          <span
            className={cn(
              "tnum ml-auto w-[86px] whitespace-nowrap text-right font-mono text-[12px] font-medium lg:ml-0",
              TONE_TEXT[tone]
            )}
          >
            {cancelled ? "—" : dueLabel(task.dueDate, now, task.dueTime)}
          </span>
        </span>
      </button>
    </div>
  );
}
