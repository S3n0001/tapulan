import type { StrandCode } from "./types";

/**
 * The chosen strand is a plain (non-HttpOnly) cookie: the client writes it,
 * the server reads it to render the right view on first paint. Mirrors of
 * this live nowhere else — one source of truth, one year of shelf life.
 */

export const STRAND_COOKIE = "tapulan_strand";
export const STRAND_MAXAGE = 365 * 86_400;
export const STRAND_CODES: StrandCode[] = ["STEM", "ABM", "HUMSS"];

export function parseStrand(value: string | undefined | null): StrandCode | null {
  return STRAND_CODES.includes(value as StrandCode) ? (value as StrandCode) : null;
}
