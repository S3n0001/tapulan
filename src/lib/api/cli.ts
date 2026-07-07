import "server-only";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyApiToken, type ApiToken } from "@/lib/auth/tokens";

/**
 * Shared plumbing for the /api/cli/* routes. Responses use the same
 * `{ ok, data | error }` envelope as the server actions, so the CLI can
 * treat every reply uniformly.
 */

export function jsonOk<T>(data: T): NextResponse {
  return NextResponse.json({ ok: true, data });
}

export function jsonErr(error: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

/**
 * Resolve the request's bearer token. Returns the token's metadata, or a
 * ready-to-return 401 — callers early-return on `instanceof Response`.
 */
export function requireToken(req: Request): ApiToken | NextResponse {
  return (
    verifyApiToken(req.headers.get("authorization")) ??
    jsonErr("Invalid or revoked token. Run `tapulan login` again.", 401)
  );
}

/** Mutations here bypass server actions, so refresh the whole tree manually. */
export function refreshViews(): void {
  revalidatePath("/", "layout");
}
