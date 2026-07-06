"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";

/**
 * Lightweight dropdown. The trigger element gets click + aria wiring
 * injected; the popup positions below it. Closes on outside click,
 * escape, or item select. Arrow keys move focus between items.
 */

interface TriggerProps {
  onClick: (e: React.MouseEvent) => void;
  "aria-expanded": boolean;
  "aria-haspopup": "menu";
  "aria-controls": string;
}

export function Menu({
  trigger,
  children,
  align = "start",
  width = 224,
  className,
}: {
  trigger: ReactElement<TriggerProps>;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  width?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const { mounted, state } = usePresence(open, 140);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = [
          ...(popRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])') ??
            []),
        ];
        if (items.length === 0) return;
        const idx = items.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === "ArrowDown"
            ? items[(idx + 1) % items.length]
            : items[(idx - 1 + items.length) % items.length];
        next.focus();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!isValidElement(trigger)) return null;

  const wired = cloneElement(trigger, {
    onClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen((v) => !v);
    },
    "aria-expanded": open,
    "aria-haspopup": "menu" as const,
    "aria-controls": menuId,
  });

  const close = () => setOpen(false);

  return (
    <span ref={rootRef} className={cn("relative inline-block", className)}>
      {wired}
      {mounted && (
        <div
          ref={popRef}
          id={menuId}
          role="menu"
          data-state={state}
          style={{ width }}
          className={cn(
            "anim-pop absolute z-30 mt-1 overflow-hidden rounded-[var(--r-card)] border border-line bg-pop p-1 shadow-[var(--shadow-pop),inset_0_1px_0_oklch(1_0_0/0.04)]",
            align === "end" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          )}
        >
          {typeof children === "function" ? children(close) : children}
        </div>
      )}
    </span>
  );
}

export function MenuItem({
  onSelect,
  icon,
  selected,
  danger,
  disabled,
  children,
  trailing,
}: {
  onSelect: () => void;
  icon?: ReactNode;
  selected?: boolean;
  danger?: boolean;
  disabled?: boolean;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-left text-[13px] font-medium outline-none transition-colors duration-[var(--dur-1)] tap",
        danger ? "text-danger-text" : "text-ink",
        selected && "bg-[color-mix(in_oklab,var(--brand)_10%,transparent)]",
        "hover:bg-surface-2 focus:bg-surface-2 focus-visible:bg-surface-2 active:bg-surface-2 disabled:pointer-events-none disabled:opacity-55"
      )}
    >
      {icon && <span className="flex w-4 shrink-0 items-center justify-center text-muted">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
      {selected && <Check className="size-3.5 shrink-0 text-brand-text" />}
    </button>
  );
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pb-1 pt-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">
      {children}
    </div>
  );
}

export function MenuSeparator() {
  return <div className="mx-1 my-1 h-px bg-line" role="separator" />;
}
