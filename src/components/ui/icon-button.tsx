"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — icon-only controls must still announce themselves. */
  "aria-label": string;
  size?: "sm" | "md";
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, size = "md", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        // the mobile-only ::before grows the touch target to ~44px without
        // changing the visual size (one-thumb / WCAG target-size)
        "relative inline-flex shrink-0 items-center justify-center rounded-[var(--r-control)] text-muted transition-[color,background-color,transform] duration-[var(--dur-1)] before:absolute before:-inset-2 before:content-[''] lg:before:hidden active:scale-95 active:duration-[var(--dur-0)] hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)] disabled:pointer-events-none disabled:opacity-55",
        size === "md" ? "size-7" : "size-6",
        className
      )}
      {...rest}
    />
  );
});
