"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";

/**
 * Anchored popover — the Menu's outside-click/Escape/positioning behavior
 * generalized to arbitrary content (inline pickers, small editors). Portal-
 * rendered below its anchor, flipping above when the viewport runs out.
 */

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function Popover({
  open,
  onClose,
  anchorRef,
  children,
  align = "start",
  width = 224,
}: {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: ReactNode;
  align?: "start" | "end";
  width?: number | string;
}) {
  const popRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const { mounted, state } = usePresence(open, 140);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);

  // place below the anchor (above when the viewport runs out); re-place on
  // scroll/resize/content growth so the popup can't drift off its anchor
  useLayoutEffect(() => {
    if (!mounted) return;
    function place() {
      const anchor = anchorRef.current;
      const pop = popRef.current;
      if (!anchor || !pop) return;
      const a = anchor.getBoundingClientRect();
      const w = pop.offsetWidth;
      const h = pop.offsetHeight;
      const above = a.bottom + 4 + h > window.innerHeight && a.top - 4 - h >= 0;
      const left = Math.max(
        8,
        Math.min(align === "end" ? a.right - w : a.left, window.innerWidth - w - 8)
      );
      setPos({ top: above ? a.top - 4 - h : a.bottom + 4, left, above });
    }
    place();
    const ro = new ResizeObserver(place);
    if (popRef.current) ro.observe(popRef.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [mounted, align, anchorRef]);

  // focus in once the popup is in the DOM, restore to the anchor side on close
  useEffect(() => {
    if (!open || !mounted) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const el = popRef.current;
    const target =
      el?.querySelector<HTMLElement>("[data-autofocus]") ??
      el?.querySelector<HTMLElement>(FOCUSABLE) ??
      el;
    target?.focus({ preventScroll: true });
    return () => restoreRef.current?.focus?.({ preventScroll: true });
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent | TouchEvent) {
      const t = e.target as Node;
      if (popRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    }
    // capture phase so Escape is swallowed before an enclosing Panel's
    // document-level listener sees it — one press closes only the popover
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      onClose();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, anchorRef]);

  function onTrapKey(e: React.KeyboardEvent) {
    if (e.key !== "Tab" || !popRef.current) return;
    const items = [...popRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (n) => !n.hasAttribute("disabled") && n.offsetParent !== null
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === popRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popRef}
      role="dialog"
      tabIndex={-1}
      data-state={state}
      onKeyDown={onTrapKey}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width }}
      className={cn(
        "anim-pop fixed z-50 overflow-hidden rounded-[var(--r-card)] border border-line bg-pop p-1 shadow-[var(--shadow-pop),inset_0_1px_0_oklch(1_0_0/0.04)] outline-none",
        pos?.above
          ? align === "end"
            ? "origin-bottom-right"
            : "origin-bottom-left"
          : align === "end"
            ? "origin-top-right"
            : "origin-top-left"
      )}
    >
      {children}
    </div>,
    document.body
  );
}
