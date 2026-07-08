"use client";

import { useRef, useState, type ReactNode } from "react";
import { ChevronsUpDown } from "lucide-react";
import { accentStyle } from "@/lib/domain/hues";
import { cn } from "@/lib/utils";
import { Popover } from "./popover";
import { MenuItem } from "./menu";
import { Spinner } from "./spinner";

export interface SelectOption<T extends string> {
  value: T;
  /** shown in the trigger and as the row's primary text */
  label: ReactNode;
  /** muted secondary text after the label, list-only */
  hint?: ReactNode;
  /** functional hue token → a leading accent dot (unless `icon` is set) */
  hue?: string;
  /** overrides the hue dot in both the trigger and the row */
  icon?: ReactNode;
}

/**
 * A custom single-value dropdown — the app's picker vocabulary ([[popover]] +
 * [[menu]] items) packaged as a self-contained control. Not the native
 * `<select>`: the trigger reads like the other controls, the panel is
 * portal-rendered so it escapes a scrolling modal's clip instead of being cut
 * off, and each option carries a hue dot + check. Keyboard: ↑/↓ walk the list,
 * Enter/Space pick, Esc closes (the popover owns Escape · outside-click · focus
 * return, matching the task-panel pickers).
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  id,
  align = "end",
  disabled,
  loading,
  width,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  ariaLabel: string;
  /** wires an enclosing `<label htmlFor>` to the trigger (form fields) */
  id?: string;
  align?: "start" | "end";
  disabled?: boolean;
  loading?: boolean;
  /** fixed panel width; defaults to the trigger's measured width */
  width?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [autoWidth, setAutoWidth] = useState<number>();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value) ?? options[0];

  function toggle() {
    if (open) return setOpen(false);
    setAutoWidth(anchorRef.current?.offsetWidth);
    setOpen(true);
  }

  // arrow-key focus walk between items, mirroring the task-panel PickerList
  function onListKey(e: React.KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [
      ...(listRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ?? []),
    ];
    if (items.length === 0) return;
    const idx = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown"
        ? items[(idx + 1) % items.length]
        : items[(idx - 1 + items.length) % items.length];
    next.focus();
  }

  const leading = loading ? (
    <Spinner className="size-3 shrink-0 text-muted" />
  ) : selected?.icon ? (
    <span className="flex size-3.5 shrink-0 items-center justify-center text-muted">
      {selected.icon}
    </span>
  ) : selected?.hue ? (
    <span aria-hidden style={accentStyle(selected.hue)} className="a-dot size-2 shrink-0 rounded-full" />
  ) : null;

  return (
    <>
      <button
        ref={anchorRef}
        id={id}
        type="button"
        disabled={disabled || loading}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={toggle}
        className={cn(
          "tap inline-flex h-8 items-center gap-2 rounded-[var(--r-control)] border border-line bg-surface pl-2.5 pr-2 text-[12.5px] font-medium text-ink transition-[background-color,border-color,transform] duration-[var(--dur-1)] hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)] disabled:pointer-events-none disabled:opacity-55",
          open && "border-line-strong bg-surface-2",
          className
        )}
      >
        {leading}
        <span className="min-w-0 flex-1 truncate text-left">{selected?.label}</span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-faint" aria-hidden />
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        align={align}
        width={width ?? autoWidth}
      >
        <div
          ref={listRef}
          role="menu"
          aria-label={ariaLabel}
          onKeyDown={onListKey}
          className="max-h-[320px] overflow-y-auto"
        >
          {options.map((o) => (
            <MenuItem
              key={o.value}
              selected={o.value === value}
              dataAutofocus={o.value === value}
              icon={
                o.icon ??
                (o.hue ? (
                  <span style={accentStyle(o.hue)} className="a-dot size-2 rounded-full" />
                ) : undefined)
              }
              onSelect={() => {
                setOpen(false);
                if (o.value !== value) onChange(o.value);
              }}
            >
              {o.label}
              {o.hint && <span className="ml-1.5 font-normal text-muted">{o.hint}</span>}
            </MenuItem>
          ))}
        </div>
      </Popover>
    </>
  );
}
