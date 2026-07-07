"use server";

import { mintApiToken, revokeApiToken, type ApiToken } from "@/lib/auth/tokens";
import { fail, guarded, type ActionResult } from "./_shared";

/**
 * Admin-guarded CLI-token management for the Settings tab. Minting returns
 * the raw token exactly once; after that only the label/dates are visible.
 */

export async function createCliToken(
  label: string
): Promise<ActionResult<{ token: string; meta: ApiToken }>> {
  const clean = label.trim().slice(0, 60);
  if (!clean) return fail("Give the token a label — e.g. whose laptop it lives on.");
  return guarded(() => mintApiToken(clean));
}

export async function revokeCliToken(id: number): Promise<ActionResult> {
  return guarded(() => {
    if (!revokeApiToken(id)) throw new Error("That token was already revoked.");
  });
}
