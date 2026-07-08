"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { STRAND_COOKIE, STRAND_MAXAGE, parseStrand } from "@/lib/domain/strand";
import { ONBOARDED_COOKIE, ONBOARDED_MAXAGE } from "@/lib/domain/onboarding";

/**
 * Finish onboarding from the landing: remember the chosen strand (or clear it,
 * for the whole-section view), mark the device onboarded so the soft gate stops
 * intercepting "/", then drop the student into Today.
 *
 * `value` is a strand code ("STEM" | "ABM" | "HUMSS"), or "" for the
 * whole-section / skip path — the same contract as the in-app strand switcher.
 */
export async function completeOnboarding(value: string): Promise<void> {
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

  store.set(ONBOARDED_COOKIE, "1", {
    path: "/",
    maxAge: ONBOARDED_MAXAGE,
    sameSite: "lax",
  });

  // redirect() throws to unwind — must stay outside any try/catch.
  redirect("/");
}
