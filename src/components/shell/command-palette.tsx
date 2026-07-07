"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Layers, Lock, Search, SunMoon } from "lucide-react";
import { setStrand } from "@/actions/session";
import type { Strand, StrandCode } from "@/lib/domain/types";
import { accentStyle } from "@/lib/domain/hues";
import { fmtDateShort, toISODate } from "@/lib/domain/time";
import { cn } from "@/lib/utils";
import { usePresence } from "@/hooks/use-presence";
import { Kbd } from "@/components/ui/kbd";
import { useClassDetail } from "@/components/classes/class-detail";
import { useIsAdmin } from "./admin-context";
import { NAV } from "./nav";

/** Anything in the shell can summon the palette without prop plumbing. */
const OPEN_EVENT = "tapulan:cmdk";
export function openPalette(): void {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export interface PaletteTask {
  id: number;
  title: string;
  type: string;
  subject: string;
  due: string;
}

export interface PaletteSubject {
  id: number;
  short: string;
  name: string;
}

interface Entry {
  id: string;
  section: string;
  label: string;
  hint?: string;
  icon?: ReactNode;
  right?: ReactNode;
  run: () => void;
}

function matches(query: string, haystack: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = haystack.toLowerCase();
  return q.split(/\s+/).every((part) => hay.includes(part));
}

export function CommandPalette({
  strands,
  current,
  tasks,
  subjects,
}: {
  strands: Strand[];
  current: StrandCode | null;
  tasks: PaletteTask[];
  subjects: PaletteSubject[];
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const { openClass } = useClassDetail();
  const isAdmin = useIsAdmin();
  const [, startStrand] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { mounted, state } = usePresence(open, 140);

  const close = useCallback(() => setOpen(false), []);

  // global keys: ⌘K / ctrl+K / "/" to open, 1–5 to jump views
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = e.key;
      if ((e.metaKey || e.ctrlKey) && key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      const target = e.target as HTMLElement | null;
      const typing = target?.closest('input, textarea, select, [contenteditable="true"]');
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (key === "/") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      const nav = NAV.find((n) => n.shortcut === key);
      if (nav && !open) {
        e.preventDefault();
        router.push(nav.href);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, open]);

  // external open requests (sidebar / mobile search buttons)
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  // reset + focus per open; lock background scroll and restore focus on close
  useEffect(() => {
    if (!open) return;
    const restore = document.activeElement as HTMLElement | null;
    setQuery("");
    setActive(0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.body.style.overflow = prevOverflow;
      restore?.focus?.();
    };
  }, [open]);

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];

    for (const n of NAV) {
      if (!matches(query, `go to ${n.label}`)) continue;
      list.push({
        id: `nav-${n.href}`,
        section: "Go to",
        label: n.label,
        icon: <n.icon className="size-4" />,
        right: <Kbd>{n.shortcut}</Kbd>,
        run: () => router.push(n.href),
      });
    }
    // admin stays out of students' sight: listed for signed-in admins, or
    // only once someone deliberately types it
    if (isAdmin || (query.trim().length >= 2 && matches(query, "admin"))) {
      list.push({
        id: "nav-admin",
        section: "Go to",
        label: "Admin",
        icon: <Lock className="size-4" />,
        run: () => router.push("/admin"),
      });
    }

    for (const s of strands) {
      if (s.code === current) continue;
      if (!matches(query, `strand switch ${s.code} ${s.name}`)) continue;
      list.push({
        id: `strand-${s.code}`,
        section: "Strand",
        label: `Switch to ${s.code}`,
        hint: s.name,
        icon: <span style={accentStyle(s.hue)} className="a-dot size-2 rounded-full" />,
        run: () => startStrand(() => setStrand(s.code)),
      });
    }
    if (current !== null && matches(query, "strand whole section all strands")) {
      list.push({
        id: "strand-all",
        section: "Strand",
        label: "Whole section",
        hint: "all strands",
        icon: <Layers className="size-4" />,
        run: () => startStrand(() => setStrand("")),
      });
    }

    if (matches(query, "toggle theme light dark")) {
      list.push({
        id: "theme",
        section: "Theme",
        label: "Toggle light / dark",
        icon: <SunMoon className="size-4" />,
        run: () =>
          setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark"),
      });
    }

    // empty palette peeks at what's due soon; a query switches to full search
    if (!query.trim()) {
      const todayISO = toISODate(new Date());
      const soon = tasks
        .filter((t) => t.due >= todayISO)
        .sort((a, b) => a.due.localeCompare(b.due))
        .slice(0, 6);
      for (const t of soon) {
        list.push({
          id: `soon-${t.id}`,
          section: "Due soon",
          label: t.title,
          hint: t.subject,
          icon: <span className="font-mono text-[10px] font-semibold text-faint">{t.type}</span>,
          right: <span className="tnum font-mono text-[11px] text-faint">{fmtDateShort(t.due)}</span>,
          run: () => router.push(`/tasks?task=${t.id}`),
        });
      }
    }

    const taskHits = tasks
      .filter((t) => query.trim() && matches(query, `${t.title} ${t.subject} ${t.type}`))
      .slice(0, 8);
    for (const t of taskHits) {
      list.push({
        id: `task-${t.id}`,
        section: "Tasks",
        label: t.title,
        hint: t.subject,
        icon: <span className="font-mono text-[10px] font-semibold text-faint">{t.type}</span>,
        right: <span className="tnum font-mono text-[11px] text-faint">{fmtDateShort(t.due)}</span>,
        run: () => router.push(`/tasks?task=${t.id}`),
      });
    }

    const subjectHits = subjects
      .filter((s) => query.trim() && matches(query, `${s.short} ${s.name}`))
      .slice(0, 6);
    for (const s of subjectHits) {
      list.push({
        id: `class-${s.id}`,
        section: "Classes",
        label: s.name,
        hint: s.short,
        icon: <span className="font-mono text-[10px] font-semibold text-faint">{s.short}</span>,
        run: () => openClass(s.id),
      });
    }

    return list;
  }, [query, strands, current, tasks, subjects, router, setTheme, startStrand, isAdmin, openClass]);

  const clampedActive = Math.min(active, Math.max(0, entries.length - 1));

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${clampedActive}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [clampedActive, entries]);

  function runEntry(entry: Entry | undefined) {
    if (!entry) return;
    close();
    entry.run();
  }

  if (!mounted || typeof document === "undefined") return null;

  let lastSection: string | null = null;

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onKeyDown={(e) => {
        // trap focus — Tab never escapes to the shell behind the overlay
        if (e.key === "Tab") {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }}
    >
      <div
        data-state={state}
        className="anim-fade absolute inset-0 bg-[oklch(0.08_0.005_265/0.52)]"
        onClick={close}
        aria-hidden
      />
      <div
        data-state={state}
        className="anim-pop absolute inset-x-3 top-[10vh] mx-auto w-auto max-w-[560px] origin-top overflow-hidden rounded-[12px] border border-line bg-pop shadow-[var(--shadow-overlay)]">
        <div className="flex h-11 items-center gap-2.5 border-b border-line px-3.5">
          <Search className="size-4 shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((v) => Math.min(v + 1, entries.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((v) => Math.max(v - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                runEntry(entries[clampedActive]);
              } else if (e.key === "Escape") {
                close();
              }
            }}
            placeholder="Jump to a view, task, or class…"
            aria-label="Search commands"
            className="h-full flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-faint"
          />
          <Kbd>esc</Kbd>
        </div>

        <div ref={listRef} className="max-h-[46vh] overflow-y-auto overscroll-contain p-1.5">
          {entries.length === 0 && (
            <p className="px-2.5 py-6 text-center text-[13px] text-faint">
              Nothing matches “{query}”.
            </p>
          )}
          {entries.map((entry, i) => {
            const header =
              entry.section !== lastSection ? (
                <div
                  key={`h-${entry.section}`}
                  className="px-2 pb-1 pt-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint first:pt-1"
                >
                  {entry.section}
                </div>
              ) : null;
            lastSection = entry.section;
            return (
              <div key={entry.id}>
                {header}
                <button
                  type="button"
                  data-index={i}
                  onClick={() => runEntry(entry)}
                  onMouseMove={() => setActive(i)}
                  className={cn(
                    "relative flex h-9 w-full items-center gap-2.5 rounded-[6px] px-2 text-left text-[13px] font-medium text-ink transition-colors duration-[var(--dur-1)]",
                    i === clampedActive &&
                      "bg-[color-mix(in_oklab,var(--brand)_12%,var(--surface))] text-ink before:absolute before:inset-y-1 before:left-0 before:w-[2px] before:rounded-full before:bg-brand"
                  )}
                >
                  {entry.icon && (
                    <span className="flex w-5 shrink-0 items-center justify-center text-muted">
                      {entry.icon}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">
                    {entry.label}
                    {entry.hint && (
                      <span className="ml-2 truncate text-[12px] font-normal text-faint">
                        {entry.hint}
                      </span>
                    )}
                  </span>
                  {entry.right}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex h-8 items-center gap-2 border-t border-line px-3 text-[11px] text-faint">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          <span>navigate</span>
          <span className="text-line-strong">·</span>
          <Kbd>↵</Kbd>
          <span>open</span>
          <span className="text-line-strong">·</span>
          <Kbd>esc</Kbd>
          <span>close</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
