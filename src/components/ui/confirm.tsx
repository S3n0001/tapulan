"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePresence } from "@/hooks/use-presence";
import { Button } from "./button";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<(value: boolean) => void>(null);
  // keep the last options around so the card doesn't blank during its exit
  const lastRef = useRef<ConfirmOptions | null>(null);
  if (options) lastRef.current = options;
  const shown = options ?? lastRef.current;
  const { mounted, state } = usePresence(options !== null, 140);

  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const descId = useId();

  const confirm = useCallback<Confirm>((opts) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOptions(null);
  }, []);

  // while open: trap Tab inside the dialog, handle Escape even after focus
  // wanders, and restore focus to the trigger on close
  useEffect(() => {
    if (!options) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        settle(false);
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus?.();
    };
  }, [options, settle]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {mounted && shown && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center p-4"
          role="alertdialog"
          aria-modal="true"
          aria-label={shown.title}
          aria-describedby={shown.description ? descId : undefined}
        >
          <div
            data-state={state}
            className="anim-fade absolute inset-0 bg-[oklch(0.08_0.004_80/0.52)]"
            onClick={() => settle(false)}
            aria-hidden
          />
          <div
            ref={dialogRef}
            data-state={state}
            className="anim-pop relative w-full max-w-[380px] rounded-[var(--r-panel)] border border-line bg-pop p-4 shadow-[var(--shadow-overlay)]"
          >
            <h2 className="text-[14px] font-semibold text-ink">{shown.title}</h2>
            {shown.description && (
              <p id={descId} className="mt-1.5 text-[13px] leading-relaxed text-muted">
                {shown.description}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => settle(false)} autoFocus>
                {shown.cancelLabel ?? "Cancel"}
              </Button>
              <Button
                size="sm"
                variant="primary"
                className={
                  shown.danger
                    ? "border-transparent bg-danger text-on-danger hover:bg-[color-mix(in_oklab,var(--danger)_88%,var(--bg))]"
                    : undefined
                }
                onClick={() => settle(true)}
              >
                {shown.confirmLabel ?? "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
