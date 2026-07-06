import type { CSSProperties } from "react";

/**
 * The functional hue ramp. Subjects and task types store one of these
 * token names; the actual OKLCH values live in globals.css and swap with
 * the theme. Components never see raw color values.
 */

export const HUES = [
  "red",
  "orange",
  "amber",
  "lime",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "fuchsia",
  "rose",
  "slate",
] as const;

export type Hue = (typeof HUES)[number];

export function isHue(value: string): value is Hue {
  return (HUES as readonly string[]).includes(value);
}

/** CSS value for a stored hue token (unknown tokens fall back to slate). */
export function hueVar(hue: string): string {
  return `var(--h-${isHue(hue) ? hue : "slate"})`;
}

/** Inline style that feeds the `.accent` utilities via the `--a` channel. */
export function accentStyle(hue: string): CSSProperties {
  return { "--a": hueVar(hue) } as CSSProperties;
}
