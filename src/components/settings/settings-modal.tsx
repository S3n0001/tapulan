"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SlidersHorizontal, X } from "lucide-react";
import type { Strand, StrandCode } from "@/lib/domain/types";
import { usePresence } from "@/hooks/use-presence";
import { IconButton } from "@/components/ui/icon-button";
import { SettingsContent } from "./settings-content";

/**
 * Personal preferences as a centered modal — the same overlay recipe as the
 * confirm dialog and the material viewer (portal · scrim · anim-pop card ·
 * focus trap · Esc · scroll lock). It's a modal rather than a page because the
 * handful of device-local controls never filled a full route; here they sit in
 * a surface sized to the content, over whatever view you were already on.
 *
 * Mounted once in the app shell; anything in the shell summons it with
 * `openSettings()` (the sidebar gear, the mobile gear, the ⌘K entry, and the
 * /settings deep link), the same event pattern the palette uses.
 */

/**
 * A tiny module channel instead of a window event: a trigger can fire before
 * the modal has mounted (the /settings deep link opens it on the same load that
 * mounts the shell), and a plain event dispatched then would be lost. If no
 * modal is listening yet, we remember the request and the modal claims it on
 * mount.
 */
const openListeners = new Set<() => void>();
let pendingOpen = false;

/** Summon the settings modal from anywhere in the shell, without prop plumbing. */
export function openSettings(): void {
  if (openListeners.size > 0) openListeners.forEach((l) => l());
  else pendingOpen = true;
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function SettingsModal({
  strands,
  current,
}: {
  strands: Strand[];
  current: StrandCode | null;
}) {
  const [open, setOpen] = useState(false);
  const { mounted, state } = usePresence(open);
  const ref = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // external open requests (sidebar / mobile / palette / /settings route),
  // claiming any request that fired before this mounted
  useEffect(() => {
    const onOpen = () => setOpen(true);
    openListeners.add(onOpen);
    if (pendingOpen) {
      pendingOpen = false;
      setOpen(true);
    }
    return () => {
      openListeners.delete(onOpen);
    };
  }, []);

  // focus in on open, lock background scroll, Escape + Tab trap, restore focus.
  // Gate on `mounted` too: usePresence renders the portal one commit after
  // `open` flips, so keying only on `open` would run this while ref is still
  // null and focus would never land.
  useEffect(() => {
    if (!open || !mounted) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const el = ref.current;
    el?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (n) => !n.hasAttribute("disabled") && n.offsetParent !== null
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === el)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.({ preventScroll: true });
    };
  }, [open, mounted]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        data-state={state}
        className="anim-fade absolute inset-0 bg-[oklch(0.08_0.004_80/0.52)]"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        ref={ref}
        tabIndex={-1}
        data-state={state}
        className="anim-pop relative flex max-h-[calc(100dvh-1.5rem)] w-full max-w-[520px] flex-col overflow-hidden rounded-[var(--r-panel)] border border-line bg-pop shadow-[var(--shadow-overlay)] outline-none sm:max-h-[calc(100dvh-2rem)]"
      >
        <header className="flex shrink-0 items-center gap-2.5 border-b border-line px-4 py-3">
          <SlidersHorizontal aria-hidden className="size-4.5 shrink-0 text-muted" strokeWidth={1.75} />
          <h2
            id="settings-modal-title"
            className="min-w-0 flex-1 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink"
          >
            Settings
          </h2>
          <span className="mr-0.5 hidden text-[12px] text-faint sm:inline">This device</span>
          <IconButton aria-label="Close settings" onClick={() => setOpen(false)} className="-mr-1">
            <X className="size-4" />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <SettingsContent strands={strands} current={current} />
        </div>
      </div>
    </div>,
    document.body
  );
}
