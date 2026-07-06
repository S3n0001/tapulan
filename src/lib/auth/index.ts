import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getMeta, setMeta } from "@/lib/db";

/**
 * Single shared admin password, verified server-side (scrypt). A logged-in
 * admin holds an HMAC-signed, HttpOnly session cookie. The signing secret
 * is generated per-installation and stored in the database.
 */

const SESSION_COOKIE = "tapulan_admin";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expected, "hex");
  return actual.length === expectedBuf.length && timingSafeEqual(actual, expectedBuf);
}

export function checkAdminPassword(password: string): boolean {
  const stored = getMeta("admin_password");
  return stored !== null && verifyPassword(password, stored);
}

export function setAdminPassword(password: string): void {
  setMeta("admin_password", hashPassword(password));
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
