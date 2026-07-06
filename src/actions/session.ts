"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { STRAND_COOKIE, STRAND_MAXAGE, parseStrand } from "@/lib/domain/strand";

/**
 * Public (non-admin) action: remember which strand this device is.
 * Written as a normal cookie so the server can render the right view on
 * first paint; cleared when the user picks "no strand".
 */
export async function setStrand(value: string): Promise<void> {
  const strand = parseStrand(value);
  const store = await cookies();
  if (strand) {
    store.set(STRAND_COOKIE, strand, {
      path: "/",
      maxAge: STRAND_MAXAGE,
      sameSite: "lax",
    });
  } else {
    store.delete(STRAND_COOKIE);
  }
  revalidatePath("/", "layout");
}
