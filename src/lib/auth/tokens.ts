import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

/**
 * Personal-access tokens for the CLI — the same trust level as an admin
 * session, minus the browser. A token is `tpl_` + 32 base64url chars
 * (192 random bits) shown exactly once; only its SHA-256 digest lands in
 * SQLite. High-entropy random tokens don't need a slow hash — lookup is
 * a straight indexed match on the digest.
 */

const PREFIX = "tpl_";

export interface ApiToken {
  id: number;
  label: string;
  createdAt: string;
  lastUsedAt: string | null;
}

interface TokenRow {
  id: number;
  label: string;
  created_at: string;
  last_used_at: string | null;
}

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function map(row: TokenRow): ApiToken {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  };
}

/** Mint a new token. The raw value is returned once and never stored. */
export function mintApiToken(label: string): { token: string; meta: ApiToken } {
  const token = PREFIX + randomBytes(24).toString("base64url");
  const createdAt = new Date().toISOString();
  const info = getDb()
    .prepare("INSERT INTO api_tokens (token_hash, label, created_at) VALUES (?, ?, ?)")
    .run(digest(token), label.trim() || "CLI", createdAt);
  return {
    token,
    meta: { id: Number(info.lastInsertRowid), label: label.trim() || "CLI", createdAt, lastUsedAt: null },
  };
}

/** Resolve an `Authorization: Bearer …` header; touches last_used_at. */
export function verifyApiToken(authorization: string | null): ApiToken | null {
  const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? "");
  if (!match || !match[1].startsWith(PREFIX)) return null;
  const db = getDb();
  const row = db
    .prepare("SELECT id, label, created_at, last_used_at FROM api_tokens WHERE token_hash = ?")
    .get(digest(match[1])) as TokenRow | undefined;
  if (!row) return null;
  // touch last_used_at at most hourly — otherwise every read (incl. whoami)
  // turns into a write and the timestamp churns pointlessly
  const nowMs = Date.now();
  const lastMs = row.last_used_at ? Date.parse(row.last_used_at) : 0;
  if (nowMs - lastMs > 3_600_000) {
    db.prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?").run(
      new Date(nowMs).toISOString(),
      row.id
    );
  }
  return map(row);
}

export function listApiTokens(): ApiToken[] {
  return (
    getDb()
      .prepare("SELECT id, label, created_at, last_used_at FROM api_tokens ORDER BY created_at DESC")
      .all() as TokenRow[]
  ).map(map);
}

/** Returns false when the id didn't exist (already revoked). */
export function revokeApiToken(id: number): boolean {
  return getDb().prepare("DELETE FROM api_tokens WHERE id = ?").run(id).changes > 0;
}
