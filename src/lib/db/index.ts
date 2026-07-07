import "server-only";
import DatabaseConstructor, { type Database } from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { SCHEMA } from "./schema";
import { seedDatabase } from "./seed";

/**
 * SQLite lives at data/tapulan.db (created + seeded on first touch).
 * The handle is cached on globalThis so dev-server hot reloads reuse it.
 */

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Idempotent column adds for databases created before a feature landed.
 * `CREATE TABLE IF NOT EXISTS` never alters an existing table, so upgrades
 * that add a column have to backfill it here.
 */
function migrate(db: Database): void {
  const cols = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "cancel_reason")) {
    db.exec("ALTER TABLE tasks ADD COLUMN cancel_reason TEXT");
  }
}

function open(): Database {
  // DATA_DIR lets a host mount a persistent volume for the DB + uploads;
  // defaults to ./data next to the app for local dev.
  const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseConstructor(path.join(dir, "tapulan.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);

  const seeded = db.prepare("SELECT COUNT(*) AS n FROM strands").get() as { n: number };
  if (seeded.n === 0) {
    seedDatabase(db);
  }

  // Auth + section meta, created independently of the content seed so an
  // existing database gains them on upgrade too.
  const getRow = db.prepare("SELECT value FROM meta WHERE key = ?");
  const putIfAbsent = db.prepare("INSERT OR IGNORE INTO meta (key, value) VALUES (?, ?)");
  if (!getRow.get("admin_password")) {
    putIfAbsent.run("admin_password", hashPassword(process.env.ADMIN_PASSWORD || "tapulan"));
  }
  if (!getRow.get("session_secret")) {
    putIfAbsent.run("session_secret", randomBytes(32).toString("hex"));
  }
  putIfAbsent.run("section_name", "Grade 12 · St. Lorenzo Ruiz");
  putIfAbsent.run("school_year", "SY 2026–2027");

  return db;
}

const globalStore = globalThis as unknown as { __tapulanDb?: Database };

export function getDb(): Database {
  if (!globalStore.__tapulanDb) {
    globalStore.__tapulanDb = open();
  }
  return globalStore.__tapulanDb;
}

export function getMeta(key: string): string | null {
  const row = getDb().prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setMeta(key: string, value: string): void {
  getDb()
    .prepare(
      "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}
