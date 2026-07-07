import type { TaskFull } from "@/lib/domain/types";
import { accentStyle } from "@/lib/domain/hues";
import { cn } from "@/lib/utils";

/**
 * A compact marker for the requirements due on one class meeting — pinned to
 * the schedule block so a peta due Thursday shows up on Thursday's class, not
 * only in a separate list. A lone task shows its type code (PETA, QUIZ…);
 * several collapse to a count. Purely informational: the block it sits on
 * owns the click (opens the class), where the tasks are listed in full.
 */
export function DueFlag({
  tasks,
  className,
}: {
  tasks: TaskFull[];
  className?: string;
}) {
  if (tasks.length === 0) return null;
  const single = tasks.length === 1 ? tasks[0] : null;
  const titles = tasks.map((t) => t.title).join(" · ");
  return (
    <span
      title={titles}
      aria-label={`${tasks.length} due — ${titles}`}
      style={single ? accentStyle(single.type.hue) : undefined}
      className={cn(
        "inline-flex h-[15px] shrink-0 items-center rounded-[4px] px-1 font-mono text-[9px] font-bold uppercase leading-none tracking-[0.02em]",
        single
          ? "a-text a-tint-2"
          : "bg-[color-mix(in_oklab,var(--brand)_16%,var(--bg))] text-brand-text",
        className
      )}
    >
      <span className="max-w-[8ch] truncate">
        {single ? single.type.short : tasks.length}
      </span>
    </span>
  );
}
