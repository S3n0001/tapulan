import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { headers as nextHeaders, cookies } from "next/headers";
import { getDb, getMeta, setMeta } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

/**
 * Single shared admin password, verified server-side (scrypt). A logged-in
 * admin holds an HMAC-signed, HttpOnly session cookie. The signing secret
 * is generated per-installation and stored in the database.
 */

const SESSION_COOKIE = "tapulan_admin";
const SESSION_DAYS = 30;

export { hashPassword, verifyPassword };

export function checkAdminPassword(password: string): boolean {
  const stored = getMeta("admin_password");
  return stored !== null && verifyPassword(password, stored);
}

export function setAdminPassword(password: string): void {
  setMeta("admin_password", hashPassword(password));
}

// ---------------------------------------------------------- rate limiting

/**
 * Shared login rate limiter for both the web login action and the CLI
 * pairing route — one counter per client IP, persisted in SQLite so a
 * redeploy (or serverless cold start) doesn't reset attackers back to zero.
 * The lockout window is fixed-length and does NOT extend on every attempt
 * while already locked out, so a flood of requests can't turn a 60s lockout
 * into a permanent one for the real admin.
 */
const MAX_ATTEMPTS = 6;
const LOCK_MS = 60_000;
const FAIL_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Best-effort client IP; falls back to a constant only when none is known. */
export async function clientIpFromHeaders(): Promise<string> {
  const store = await nextHeaders();
  return ipFromHeaderGetter((name) => store.get(name)) ?? "unknown";
}

export function clientIpFromRequest(req: Request): string {
  return ipFromHeaderGetter((name) => req.headers.get(name)) ?? "unknown";
}

function ipFromHeaderGetter(get: (name: string) => string | null): string | null {
  const forwarded = get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = get("x-real-ip");
  if (real) return real.trim();
  return null;
}

interface LoginGate {
  count: number;
  until: number;
}

function getLoginGate(key: string): LoginGate {
  const row = getDb()
    .prepare("SELECT count, until FROM login_attempts WHERE key = ?")
    .get(key) as { count: number; until: number } | undefined;
  return row ? { count: row.count, until: row.until } : { count: 0, until: 0 };
}

function putLoginGate(key: string, gate: LoginGate): void {
  getDb()
    .prepare(
      "INSERT INTO login_attempts (key, count, until) VALUES (?, ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET count = excluded.count, until = excluded.until"
    )
    .run(key, gate.count, gate.until);
}

/** Returns a "try again in Ns" message if `key` is currently locked out. */
export function checkLoginLockout(key: string): string | null {
  const now = Date.now();
  const gate = getLoginGate(key);
  if (gate.until > now && gate.count >= MAX_ATTEMPTS) {
    return `Too many attempts. Try again in ${Math.ceil((gate.until - now) / 1000)}s.`;
  }
  return null;
}

/**
 * Record a failed login attempt and wait a short delay before returning.
 * The lockout window is only (re)started when a fresh window begins —
 * repeated failures during an active lockout keep the same `until`, so
 * continuous POSTs can't push the lockout forward indefinitely.
 */
export async function recordLoginFailure(key: string): Promise<void> {
  const now = Date.now();
  const gate = getLoginGate(key);
  const next: LoginGate =
    gate.until > now ? { count: gate.count + 1, until: gate.until } : { count: 1, until: now + LOCK_MS };
  putLoginGate(key, next);
  await sleep(FAIL_DELAY_MS);
}

export function clearLoginFailures(key: string): void {
  getDb().prepare("DELETE FROM login_attempts WHERE key = ?").run(key);
}

// ---------------------------------------------------------------- session

function sign(payload: string): string {
  const secret = getMeta("session_secret") ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function sessionToken(expiresAtMs: number): string {
  const payload = String(expiresAtMs);
  return `${payload}.${sign(payload)}`;
}

function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(payload) > Date.now();
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return isValidToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error("Not signed in as admin.");
  }
}

export async function startAdminSession(): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionToken(expires), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
