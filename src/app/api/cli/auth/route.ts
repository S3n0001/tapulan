import {
  checkAdminPassword,
  checkLoginLockout,
  clearLoginFailures,
  clientIpFromRequest,
  recordLoginFailure,
} from "@/lib/auth";
import { mintApiToken, revokeApiToken } from "@/lib/auth/tokens";
import { jsonErr, jsonOk, requireToken } from "@/lib/api/cli";

/**
 * CLI pairing. POST exchanges the shared admin password for a long-lived
 * bearer token (shown once); GET answers "who am I"; DELETE revokes the
 * presented token (CLI logout). Tokens carry full admin power — the web
 * Admin → Settings tab lists and revokes them.
 */

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);

  const lockedMsg = checkLoginLockout(ip);
  if (lockedMsg) return jsonErr(lockedMsg, 429);

  const body = (await req.json().catch(() => null)) as {
    password?: unknown;
    label?: unknown;
  } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  const label = typeof body?.label === "string" ? body.label.slice(0, 60) : "";

  if (!password || !checkAdminPassword(password)) {
    await recordLoginFailure(ip);
    return jsonErr("Wrong password.", 401);
  }

  clearLoginFailures(ip);
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
