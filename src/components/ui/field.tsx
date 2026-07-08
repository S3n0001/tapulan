"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: string;
  error?: string | null;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  const errorId = useId();
  // when an error is present, wire the control to it so a screen reader
  // announces it and knows which field is invalid (WCAG 3.3.1 / 1.3.1)
  const control =
    error && isValidElement(children)
      ? cloneElement(children as ReactElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>, {
          "aria-invalid": true,
          "aria-describedby": errorId,
        })
      : children;
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-1.5 text-[12px] font-medium text-muted"
      >
        {label}
        {required && (
          <span aria-hidden className="text-brand-text">
            *
          </span>
        )}
        {hint && <span className="font-normal text-faint">· {hint}</span>}
      </label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-[12px] text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL =
  "w-full rounded-[var(--r-control)] border border-line bg-surface px-2.5 text-[13px] text-ink transition-colors duration-[var(--dur-1)] placeholder:text-faint hover:border-line-strong focus:border-brand focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--ring)_45%,transparent)] disabled:opacity-55";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(CONTROL, "h-8", className)} {...rest} />;
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(CONTROL, "min-h-16 resize-y py-2 leading-relaxed", className)}
      {...rest}
    />
  );
});

/**
 * Custom brand-accented checkbox with a clickable label. Same physical
 * vocabulary as the personal done-check: the box pops (done-pop) and the
 * tick draws itself in (done-tick) when set; hovering the label previews a
 * faint tick so the affordance reads before the click.
 */
export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "group inline-flex cursor-pointer select-none items-center gap-2 text-[12.5px] text-muted transition-colors hover:text-ink",
        className
      )}
    >
      <span className="relative inline-flex">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-[var(--dur-1)] peer-focus-visible:ring-2 peer-focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)]",
            checked
              ? "done-pop border-brand bg-brand text-white"
              : "border-line-strong bg-surface text-transparent group-hover:border-brand group-hover:text-[color-mix(in_oklab,var(--brand)_40%,transparent)]"
          )}
        >
          <svg viewBox="0 0 12 12" className="size-2.5">
            <path
              d="M2.5 6.5 5 8.75 9.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={checked ? "done-tick" : undefined}
            />
          </svg>
        </span>
      </span>
      {label}
    </label>
  );
}
