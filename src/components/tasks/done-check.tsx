"use client";

import { cn } from "@/lib/utils";

/**
 * The personal "done for me" tick — local to the device, never touches the
 * shared status. The check stroke draws itself in (done-tick) and the box
 * gives a small physical pop (done-pop) when set.
 */
export function DoneCheck({
  done,
  onToggle,
  className,
}: {
  done: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={done}
      aria-label={done ? "Mark as not done" : "Mark as done for me"}
      className={cn(
        // mobile-only ::before widens the touch target around the 18px box —
        // the single most-tapped one-thumb control — kept short vertically so
        // stacked rows don't overlap
        "relative flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-[transform,background-color,border-color,color] duration-[var(--dur-1)] before:absolute before:-inset-x-3 before:-inset-y-2 before:content-[''] lg:before:hidden active:scale-90 active:duration-[var(--dur-0)]",
        done
          ? "done-pop border-transparent bg-ok text-white"
          : "border-line-strong text-transparent hover:border-ok hover:text-[color-mix(in_oklab,var(--ok)_45%,transparent)]",
        className
      )}
    >
      <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
        <path
          d="M2.5 6.5 5 8.75 9.5 3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={done ? "done-tick" : undefined}
        />
      </svg>
    </button>
  );
}
