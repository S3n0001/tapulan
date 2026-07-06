import "server-only";
import { cookies } from "next/headers";
import { STRAND_COOKIE, parseStrand } from "@/lib/domain/strand";
import type { StrandCode } from "@/lib/domain/types";

/** The device's chosen strand, read server-side for first-paint rendering. */
export async function currentStrand(): Promise<StrandCode | null> {
  const store = await cookies();
  return parseStrand(store.get(STRAND_COOKIE)?.value);
}
