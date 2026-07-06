"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-on-brand hover:bg-brand-hover active:bg-[color-mix(in_oklab,var(--brand-hover)_92%,black)] border border-transparent shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]",
  secondary:
    "bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2",
  ghost: "text-muted border border-transparent hover:bg-surface hover:text-ink",
  danger:
    "bg-surface text-danger-text border border-line hover:border-[color-mix(in_oklab,var(--danger)_45%,var(--line))] hover:bg-[color-mix(in_oklab,var(--danger)_10%,var(--surface))] active:bg-[color-mix(in_oklab,var(--danger)_16%,var(--surface))]",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 gap-1.5 rounded-[var(--r-control)] px-2.5 text-[12.5px]",
  md: "h-8 gap-1.5 rounded-[var(--r-control)] px-3 text-[13px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[color,background-color,border-color,transform] duration-[var(--dur-1)] active:scale-[0.97] active:duration-[var(--dur-0)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-bg",
        "disabled:pointer-events-none disabled:opacity-55",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {loading && <Spinner className="opacity-70" />}
      {children}
    </button>
  );
});
