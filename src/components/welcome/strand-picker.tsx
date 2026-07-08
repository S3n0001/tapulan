"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowRight, ChevronRight, Layers } from "lucide-react";
import { completeOnboarding } from "@/actions/onboarding";
import { accentStyle } from "@/lib/domain/hues";
import type { Strand } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty";

/**
 * The onboarding act. A roving-tabindex listbox where the rows ARE the commit
 * buttons: tap a strand (or press its number) and you land in Today scoped to
 * it — there is no separate "Continue". "Whole section" is a visually-equal row
 * (the Esc / 0 default), so the mandated skip is structurally identical to
 * picking. Every choice is a single press, and reversible later from the sidebar
 * switcher, which is exactly why committing on tap is safe.
 *
 * Colour stays honest: a strand's hue is neutral at rest (an 8px data dot) and
 * only tints the row on hover/focus; cobalt is spent solely on the focus ring.
 */

// hue tint + border warm up on intent (hover/focus); driven by --a (accentStyle)
const INTENT =
  "hover:[background-color:color-mix(in_oklab,var(--a)_var(--tint),var(--bg))] hover:[border-color:color-mix(in_oklab,var(--a)_38%,var(--line))] focus-visible:[background-color:color-mix(in_oklab,var(--a)_var(--tint),var(--bg))] focus-visible:[border-color:color-mix(in_oklab,var(--a)_38%,var(--line))]";

const ROW =
  "group tap relative flex min-h-[58px] w-full items-center gap-3 rounded-[var(--r-card)] border border-line bg-surface px-3.5 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-bg disabled:pointer-events-none";

interface RowModel {
  value: string; // strand code, or "" for whole section
  hue: string;
  label: string; // accessible name
  key: string | null; // keyboard hint ("1".."9" / "0")
  render: "strand" | "whole";
  strand?: Strand;
}

export function StrandPicker({ strands }: { strands: Strand[] }) {
  const [pending, start] = useTransition();
  const [committing, setCommitting] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const whole: RowModel = {
    value: "",
    hue: "slate",
    label: "Whole section: all strands, nothing hidden",
    key: "0",
    render: "whole",
  };
  const rows: RowModel[] = [
    ...strands.map((s, i) => ({
      value: s.code,
      hue: s.hue,
      label: `${s.code}: ${s.name}`,
      key: i < 9 ? String(i + 1) : null,
      render: "strand" as const,
      strand: s,
    })),
    whole,
  ];

  const commit = useCallback(
    (value: string) => {
      if (pending) return;
      setCommitting(value);
      start(() => completeOnboarding(value));
    },
    [pending, start]
  );

  // Focus the first row on load — but only for a fine pointer / keyboard, never
  // on touch, so a phone's scroll is never hijacked at 6:50 AM.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (window.matchMedia("(pointer: fine)").matches) {
      rowRefs.current[0]?.focus();
    }
  }, []);

  // Express lanes echoing the app's bare-number grammar: 1..N pick a strand,
  // 0 or Esc take the whole section. Page-level, since nothing else on /welcome
  // listens for keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pending || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape" || e.key === "0") {
        e.preventDefault();
        commit("");
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (idx < strands.length) {
          e.preventDefault();
          commit(strands[idx].code);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, commit, strands]);

  const focusRow = (i: number) => {
    const next = (i + rows.length) % rows.length;
    setActive(next);
    rowRefs.current[next]?.focus();
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    if (pending) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        focusRow(active + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        focusRow(active - 1);
        break;
      case "Home":
        e.preventDefault();
        focusRow(0);
        break;
      case "End":
        e.preventDefault();
        focusRow(rows.length - 1);
        break;
      // Enter / Space are handled natively by the <button> rows.
    }
  };

  // No strands configured yet (a section still being set up): never a dead end —
  // offer the whole-section view, which hides nothing.
  if (strands.length === 0) {
    return (
      <div>
        <EmptyState icon={Layers} title="No strands set yet" className="py-8">
          Open the whole section for now. A strand would only narrow what you see anyway.
        </EmptyState>
        <button
          type="button"
          ref={(el) => {
            rowRefs.current[0] = el;
          }}
          onClick={() => commit("")}
          disabled={pending}
          aria-label={whole.label}
          style={accentStyle(whole.hue)}
          className={cn(ROW, INTENT)}
        >
          <WholeContent committing={committing === ""} />
        </button>
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Choose how to view the section"
      aria-busy={pending}
      onKeyDown={onListKeyDown}
      className="flex flex-col gap-1.5"
    >
      {rows.map((row, i) => {
        const isCommitting = committing === row.value;
        const trailing = (
          <Trailing hint={row.key} committing={isCommitting} />
        );
        return (
          <div key={row.value || "whole"} className="contents">
            {row.render === "whole" && (
              <div className="my-0.5 h-px bg-line" role="presentation" />
            )}
            <button
              type="button"
              role="option"
              aria-selected={false}
              aria-label={row.label}
              tabIndex={i === active ? 0 : -1}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
              onClick={() => commit(row.value)}
              onFocus={() => setActive(i)}
              disabled={pending}
              style={accentStyle(row.hue)}
              className={cn(ROW, INTENT, pending && !isCommitting && "opacity-55")}
            >
              {row.render === "strand" ? (
                <StrandContent strand={row.strand!} trailing={trailing} />
              ) : (
                <WholeContent committing={isCommitting} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- row bodies */

function StrandContent({ strand, trailing }: { strand: Strand; trailing: React.ReactNode }) {
  return (
    <>
      <span className="a-dot size-2 shrink-0 rounded-full" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-[12px] font-semibold text-ink">{strand.code}</span>
          <span className="min-w-0 truncate text-[13px] text-muted">{strand.name}</span>
        </span>
        {strand.tagline && (
          <span className="mt-0.5 block truncate text-[11.5px] text-faint">{strand.tagline}</span>
        )}
      </span>
      {trailing}
    </>
  );
}

function WholeContent({ committing }: { committing: boolean }) {
  return (
    <>
      <Layers className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-ink">Whole section</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-faint">
          all strands, nothing hidden
        </span>
      </span>
      <Trailing hint="0" committing={committing} />
    </>
  );
}

function Trailing({ hint, committing }: { hint: string | null; committing: boolean }) {
  if (committing) {
    return <Spinner className="size-3.5 shrink-0 text-muted" />;
  }
  return (
    <>
      {/* mobile: a quiet chevron */}
      <ChevronRight className="size-4 shrink-0 text-faint lg:hidden" aria-hidden />
      {/* desktop: the number hint, swapping to an arrow on intent */}
      {hint && (
        <span className="relative hidden h-[17px] w-[17px] shrink-0 items-center justify-center lg:inline-flex">
          <Kbd className="absolute inset-0 transition-opacity duration-[var(--dur-1)] group-hover:opacity-0 group-focus-visible:opacity-0">
            {hint}
          </Kbd>
          <ArrowRight
            aria-hidden
            className="size-4 text-muted opacity-0 transition-opacity duration-[var(--dur-1)] group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        </span>
      )}
    </>
  );
}
