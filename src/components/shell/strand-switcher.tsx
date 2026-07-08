"use client";

import { useTransition } from "react";
import { ChevronsUpDown, ChevronDown, Layers } from "lucide-react";
import { setStrand } from "@/actions/session";
import type { Strand, StrandCode } from "@/lib/domain/types";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";

/**
 * The workspace-style strand picker. Not a gate: every view works without
 * a strand (it shows the whole section); picking one just narrows the data
 * to your own timetable. The choice is a cookie, so it follows the device.
 */
export function StrandSwitcher({
  strands,
  current,
  sectionLabel,
  variant,
  collapsed = false,
}: {
  strands: Strand[];
  current: StrandCode | null;
  /** e.g. "Grade 12 · SY 2026–2027" — quiet identity, not branding */
  sectionLabel?: string;
  variant: "sidebar" | "chip";
  /** sidebar rail mode: just the strand badge, menu intact */
  collapsed?: boolean;
}) {
  const [pending, start] = useTransition();
  const active = strands.find((s) => s.code === current) ?? null;

  const pick = (code: string) => start(() => setStrand(code));

  const items = (close: () => void) => (
    <>
      <MenuLabel>Strand</MenuLabel>
      {strands.map((s) => (
        <MenuItem
          key={s.code}
          selected={current === s.code}
          onSelect={() => {
            close();
            pick(s.code);
          }}
        >
          <span className="font-mono text-[12px] font-semibold">{s.code}</span>
          <span className="ml-1.5 text-[12px] font-normal text-muted">{s.name}</span>
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem
        selected={current === null}
        onSelect={() => {
          close();
          pick("");
        }}
      >
        Whole section
        <span className="ml-1.5 text-[12px] font-normal text-muted">all strands</span>
      </MenuItem>
    </>
  );

  if (variant === "chip") {
    return (
      <Menu align="end" width={264} trigger={
        <button
          type="button"
          className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[var(--r-chip)] border border-line bg-surface pl-2 pr-1.5 font-mono text-[11.5px] font-semibold text-ink transition-[transform,background-color,border-color] duration-[var(--dur-1)] hover:border-line-strong active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_50%,transparent)]"
        >
          {pending ? (
            <Spinner className="size-3 text-muted" />
          ) : !active ? (
            <Layers className="size-3 text-muted" />
          ) : null}
          {active ? active.code : "ALL"}
          <ChevronDown className="size-3 text-faint" />
        </button>
      }>
        {items}
      </Menu>
    );
  }

  if (collapsed) {
    return (
      <Menu width={264} className="block" trigger={
        <button
          type="button"
          title={active ? `${active.code} · ${active.name}` : "Whole section"}
          aria-label="Switch strand"
          className="mx-auto grid size-9 place-items-center rounded-full text-muted transition-[transform,background-color,color] duration-[var(--dur-1)] hover:bg-surface-2 hover:text-ink active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_50%,transparent)]"
        >
          <span className="font-mono text-[10px] font-bold">
            {pending ? <Spinner className="size-3" /> : active ? active.code : "ALL"}
          </span>
        </button>
      }>
        {items}
      </Menu>
    );
  }

  return (
    <Menu width={264} className="block w-full" trigger={
      <button
        type="button"
        className="group flex h-10 w-full items-center gap-2.5 rounded-[7px] pl-2 pr-10 text-left transition-[transform,background-color,border-color] duration-[var(--dur-1)] hover:bg-surface active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_50%,transparent)]"
      >
        {pending && <Spinner className="size-3 shrink-0 text-muted" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-ink">
            {active ? active.code : "Whole section"}
          </span>
          {sectionLabel && (
            <span className="block overflow-hidden [mask-image:linear-gradient(to_right,#000_84%,transparent)]">
              <span className="flex w-max animate-[marquee_9s_linear_infinite] hover:[animation-play-state:paused] motion-reduce:animate-none">
                <span className="whitespace-nowrap pr-8 text-[11px] leading-tight text-faint">
                  {sectionLabel}
                </span>
                <span
                  aria-hidden
                  className="whitespace-nowrap pr-8 text-[11px] leading-tight text-faint"
                >
                  {sectionLabel}
                </span>
              </span>
            </span>
          )}
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-faint" />
      </button>
    }>
      {items}
    </Menu>
  );
}
