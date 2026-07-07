import type { ReactNode } from "react";
import { accentStyle } from "@/lib/domain/hues";
import type { TaskStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** Hue-tinted code badge — task types, subject codes. Data color only. */
export function HueBadge({
  hue,
  children,
  className,
}: {
  hue: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      style={accentStyle(hue)}
      className={cn(
        "a-text a-tint-2 inline-flex h-[18px] shrink-0 items-center rounded-[5px] px-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.03em]",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Colored dot; pass a functional hue token. */
export function HueDot({ hue, className }: { hue: string; className?: string }) {
  return (
    <span
      style={accentStyle(hue)}
      className={cn("a-dot inline-block size-2 shrink-0 rounded-full", className)}
      aria-hidden
    />
  );
}

const STATUS: Record<TaskStatus, { label: string; text: string }> = {
  confirmed: { label: "Confirmed", text: "text-ok-text" },
  tentative: { label: "Unconfirmed", text: "text-warn-text" },
  done: { label: "Done", text: "text-muted" },
  cancelled: { label: "Cancelled", text: "text-faint" },
};

/** Status word — the label carries the meaning; color only reinforces it. */
export function Status({ status, className }: { status: TaskStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center text-[12px] font-medium", s.text, className)}>
      {s.label}
    </span>
  );
}

/** Small amber marker for moved / unconfirmed inline flags. */
export function WarnFlag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[17px] shrink-0 items-center rounded-[4px] bg-[color-mix(in_oklab,var(--warn)_16%,var(--bg))] px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.03em] text-warn-text">
      {children}
    </span>
  );
}

/** Positive marker for completed states like done-in-class. */
export function OkFlag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[17px] shrink-0 items-center rounded-[4px] bg-[color-mix(in_oklab,var(--ok)_16%,var(--bg))] px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.03em] text-ok-text">
      {children}
    </span>
  );
}

/** Muted marker for terminal states like cancelled — neutral, never alarming. */
export function MutedFlag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-[17px] shrink-0 items-center rounded-[4px] bg-surface-2 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.03em] text-faint">
      {children}
    </span>
  );
}
