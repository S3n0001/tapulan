import { checkAdminPassword } from "@/lib/auth";
import { mintApiToken, revokeApiToken } from "@/lib/auth/tokens";
import { jsonErr, jsonOk, requireToken } from "@/lib/api/cli";

/**
 * CLI pairing. POST exchanges the shared admin password for a long-lived
 * bearer token (shown once); GET answers "who am I"; DELETE revokes the
 * presented token (CLI logout). Tokens carry full admin power — the web
 * Admin → Settings tab lists and revokes them.
 */

/** Same rudimentary in-process lockout as the web login. */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 6;
const LOCK_MS = 60_000;

export async function POST(req: Request) {
  const now = Date.now();
  const gate = attempts.get("cli");
  if (gate && gate.until > now && gate.count >= MAX_ATTEMPTS) {
    const secs = Math.ceil((gate.until - now) / 1000);
    return jsonErr(`Too many attempts. Try again in ${secs}s.`, 429);
  }

  const body = (await req.json().catch(() => null)) as {
    password?: unknown;
    label?: unknown;
  } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const label = typeof body?.label === "string" ? body.label.slice(0, 60) : "";

  if (!password || !checkAdminPassword(password)) {
    const next = gate && gate.until > now ? gate : { count: 0, until: now + LOCK_MS };
    next.count += 1;
    next.until = now + LOCK_MS;
    attempts.set("cli", next);
    return jsonErr("Wrong password.", 401);
  }

  attempts.delete("cli");
  const { token, meta } = mintApiToken(label || "CLI");
  return jsonOk({ token, label: meta.label, createdAt: meta.createdAt });
}

export async function GET(req: Request) {
  const auth = requireToken(req);
  if (auth instanceof Response) return auth;
  return jsonOk({ label: auth.label, createdAt: auth.createdAt });
}

export async function DELETE(req: Request) {
  const auth = requireToken(req);
  if (auth instanceof Response) return auth;
  revokeApiToken(auth.id);
  return jsonOk(null);
}
