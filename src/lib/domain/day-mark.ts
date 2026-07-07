import type { DayMark, DayMarkKind } from "./types";

/**
 * Presentation vocabulary for calendar day marks. Pure — no React, no I/O —
 * so both the server queries and the client views share one source of truth
 * for what "async" and "no class" are called and colored.
 */

export const DAY_MARK_KINDS: DayMarkKind[] = ["async", "no_class"];

/** Full name, used as the fallback title when a mark has no custom label. */
export const DAY_MARK_NAME: Record<DayMarkKind, string> = {
  async: "Asynchronous",
  no_class: "No class",
};

/** Compact label for header chips and dense rows. */
export const DAY_MARK_SHORT: Record<DayMarkKind, string> = {
  async: "Async",
  no_class: "No class",
};

/** Default one-liner shown when a mark carries no custom note. */
export const DAY_MARK_BLURB: Record<DayMarkKind, string> = {
  async:
    "No in-person classes — work through the day's subjects on your own and submit each one online by its deadline.",
  no_class: "No classes on this day — nothing scheduled and no work expected.",
};

/**
 * Plain-language definition of an async day, spelled out point by point. Kept
 * here so every place that explains it — the Today hero, the admin editor —
 * says the same thing. An async ("asynchronous") day means the section still
 * has work due, it just isn't done together in a classroom.
 */
export const DAY_MARK_ASYNC_POINTS: { label: string; text: string }[] = [
  {
    label: "No in-person class",
    text: "You don't report to campus — spend the day working from home, or wherever you are.",
  },
  {
    label: "Work on your own",
    text: "Go through the day's subjects at your own pace across the day, without a live class.",
  },
  {
    label: "Submit later",
    text: "Turn in each subject's work online by its deadline instead of handing it in during class.",
  },
];

/** Functional hue token bound to each kind (see globals.css `--h-*`). */
export const DAY_MARK_HUE: Record<DayMarkKind, string> = {
  async: "indigo",
  no_class: "slate",
};

/** The heading for a mark: its custom label, or the kind's default name. */
export function dayMarkTitle(mark: DayMark): string {
  return mark.label?.trim() || DAY_MARK_NAME[mark.kind];
}
