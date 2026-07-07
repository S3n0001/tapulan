"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";
import { IconButton } from "./icon-button";

/**
 * The app's one detail surface: a right-side peek panel on desktop, a
 * bottom sheet on mobile. Used for task details, editors, and class info —
 * same component, same vocabulary, everywhere.
 */

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Panel({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  wide = false,
  onCmdEnter,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** 480px editors vs 408px detail views (desktop only) */
  wide?: boolean;
  /** editors: ⌘/Ctrl+Enter saves from anywhere inside the panel */
  onCmdEnter?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const labelId = useId();
  const { mounted, state } = usePresence(open);

  // focus in on open, restore on close
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const target =
      el?.querySelector<HTMLElement>("[data-autofocus]") ??
      el?.querySelector<HTMLElement>(FOCUSABLE) ??
      el;
    target?.focus({ preventScroll: true });
    return () => restoreRef.current?.focus?.({ preventScroll: true });
  }, [open]);

  // scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // escape + save shortcut + tab trap
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && onCmdEnter) {
        e.preventDefault();
        onCmdEnter();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (n) => !n.hasAttribute("disabled") && n.offsetParent !== null
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === ref.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, onCmdEnter]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div
        data-state={state}
        className="anim-fade absolute inset-0 bg-[oklch(0.04_0.004_265/0.6)]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        tabIndex={-1}
        data-state={state}
        className={cn(
          // anim-detail swaps sheet-up ↔ panel-in by media query in globals.css
          // (a plain `lg:anim-panel` class doesn't exist — Tailwind only builds
          // variants for its own utilities)
          "anim-detail absolute flex flex-col bg-pop outline-none",
          // mobile: bottom sheet
          "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[14px] border-t border-line",
          // desktop: right peek panel aligned with the inset content frame
          "lg:inset-x-auto lg:inset-y-2 lg:right-2 lg:max-h-none lg:rounded-[var(--r-panel)] lg:border lg:shadow-[var(--shadow-overlay)]",
          wide ? "lg:w-[480px]" : "lg:w-[408px]"
        )}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <h2 id={labelId} className="text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
              {title}
            </h2>
            {description && (
              <div className="mt-0.5 text-[12.5px] leading-snug text-muted">{description}</div>
            )}
          </div>
          <IconButton aria-label="Close" onClick={onClose} className="-mr-1 -mt-0.5">
            <X className="size-4" />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}
