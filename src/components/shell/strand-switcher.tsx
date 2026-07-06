"use client";

import { useTransition } from "react";
import { ChevronsUpDown, ChevronDown, Layers } from "lucide-react";
import { setStrand } from "@/actions/session";
import type { Strand, StrandCode } from "@/lib/domain/types";
import { accentStyle } from "@/lib/domain/hues";
import { cn } from "@/lib/utils";
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
}: {
  strands: Strand[];
  current: StrandCode | null;
  /** e.g. "Grade 12 · SY 2026–2027" — quiet identity, not branding */
  sectionLabel?: string;
  variant: "sidebar" | "chip";
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
          icon={<span style={accentStyle(s.hue)} className="a-dot size-2 rounded-full" />}
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
        icon={<Layers className="size-3.5" />}
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
          ) : active ? (
            <span style={accentStyle(active.hue)} className="a-dot size-1.5 rounded-full" />
          ) : (
            <Layers className="size-3 text-muted" />
          )}
          {active ? active.code : "ALL"}
          <ChevronDown className="size-3 text-faint" />
        </button>
      }>
        {items}
      </Menu>
    );
  }

  return (
    <Menu width={264} className="block" trigger={
      <button
        type="button"
        className="flex h-10 w-full items-center gap-2.5 rounded-[7px] px-2 text-left transition-[transform,background-color,border-color] duration-[var(--dur-1)] hover:bg-surface active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_50%,transparent)]"
      >
        <span
          style={active ? accentStyle(active.hue) : undefined}
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-[6px] font-mono text-[11px] font-bold",
            active ? "a-tint-active a-text" : "bg-surface-2 text-muted"
          )}
        >
          {pending ? (
            <Spinner className="size-3" />
          ) : active ? (
            active.code[0]
          ) : (
            <Layers className="size-3.5" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-ink">
            {active ? active.code : "Whole section"}
          </span>
          {sectionLabel && (
            <span className="block truncate text-[11px] leading-tight text-faint">
              {sectionLabel}
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
