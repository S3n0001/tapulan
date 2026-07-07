"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Kind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: Kind;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const ICONS: Record<Kind, ReactNode> = {
  success: <CheckCircle2 className="size-4 text-ok" />,
  error: <AlertCircle className="size-4 text-danger" />,
  info: <Info className="size-4 text-brand-text" />,
};

/** One toast: tracks its own exit so the shell can play the exit keyframes. */
function ToastItem({ toast }: { toast: Toast }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    // begin the exit ~180ms before the provider removes the node (at 3800ms)
    const t = window.setTimeout(() => setLeaving(true), 3620);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div
      // errors interrupt (assertive); success/info wait their turn (polite)
      role={toast.kind === "error" ? "alert" : "status"}
      aria-live={toast.kind === "error" ? "assertive" : "polite"}
      data-state={leaving ? "closed" : "open"}
      className="anim-toast pointer-events-auto flex min-h-9 max-w-[min(92vw,26rem)] items-center gap-2 rounded-[var(--r-card)] border border-line bg-pop px-3 py-1.5 shadow-[var(--shadow-pop)]"
    >
      <span className="shrink-0">{ICONS[toast.kind]}</span>
      <p title={toast.message} className="line-clamp-3 text-[13px] font-medium text-ink">
        {toast.message}
      </p>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((kind: Kind, message: string) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-3), { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
      info: (m) => push("info", m),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* positioning only — each toast is its own live region (assertive for
          errors) so a screen reader hears them at the right urgency */}
      <div
        className={cn(
          "pointer-events-none fixed z-[70] flex flex-col items-center gap-2",
          "inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)]",
          "lg:inset-x-auto lg:bottom-4 lg:right-4 lg:items-end"
        )}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
