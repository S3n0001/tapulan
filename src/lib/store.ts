"use client";

import { useSyncExternalStore } from "react";
import { buildSeedDatabase, DB_VERSION } from "./seed";
import type { Database, Prefs, SchoolClass, Strand, Task } from "./types";

/**
 * Tapulan keeps all state in the browser (localStorage) behind a tiny
 * external store. The shape below is versioned so a future API-backed
 * adapter can replace `loadDb`/`persistDb` without touching the UI.
 */

const DB_KEY = "tapulan.db.v1";
const PREFS_KEY = "tapulan.prefs.v1";
const ADMIN_KEY = "tapulan.admin";

export interface StoreState {
  db: Database;
  prefs: Prefs;
  admin: boolean;
  /** False during SSR/prerender; true once localStorage has been read. */
  ready: boolean;
}

const DEFAULT_PREFS: Prefs = { strand: null, done: [] };

/** Stable snapshot used for server rendering / before hydration. */
const SERVER_STATE: StoreState = {
  db: { version: DB_VERSION, classes: [], tasks: [] },
  prefs: DEFAULT_PREFS,
  admin: false,
  ready: false,
};

let state: StoreState = SERVER_STATE;
let initialized = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function setState(next: Partial<StoreState>) {
  state = { ...state, ...next };
  emit();
}

// ----------------------------------------------------------- persistence

function loadDb(): Database {
  try {
    const raw = window.localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Database;
      if (parsed && parsed.version === DB_VERSION && Array.isArray(parsed.tasks)) {
        return parsed;
      }
    }
  } catch {
    // corrupted storage — fall through to a fresh seed
  }
  const seeded = buildSeedDatabase(new Date());
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(seeded));
  } catch {
    // storage full/blocked — run from memory
  }
  return seeded;
}

function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Prefs;
      return {
        strand: parsed.strand ?? null,
        done: Array.isArray(parsed.done) ? parsed.done : [],
      };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PREFS };
}

function persistDb(db: Database) {
  try {
    window.localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // ignore
  }
}

function persistPrefs(prefs: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  state = {
    db: loadDb(),
    prefs: loadPrefs(),
    admin: window.sessionStorage.getItem(ADMIN_KEY) === "1",
    ready: true,
  };
  // Keep tabs in sync.
  window.addEventListener("storage", (e) => {
    if (e.key === DB_KEY) setState({ db: loadDb() });
    if (e.key === PREFS_KEY) setState({ prefs: loadPrefs() });
  });
  emit();
}

// -------------------------------------------------------------- reading

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): StoreState {
  init();
  return state;
}

function getServerSnapshot(): StoreState {
  return SERVER_STATE;
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// -------------------------------------------------------------- actions

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function setStrand(strand: Strand) {
  const prefs = { ...state.prefs, strand };
  persistPrefs(prefs);
  setState({ prefs });
}

export function toggleDone(taskId: string) {
  const done = state.prefs.done.includes(taskId)
    ? state.prefs.done.filter((id) => id !== taskId)
    : [...state.prefs.done, taskId];
  const prefs = { ...state.prefs, done };
  persistPrefs(prefs);
  setState({ prefs });
}

export function clearProgress() {
  const prefs = { ...state.prefs, done: [] };
  persistPrefs(prefs);
  setState({ prefs });
}

export type TaskInput = Omit<Task, "id" | "createdAt" | "updatedAt">;

export function addTask(input: TaskInput): Task {
  const now = new Date().toISOString();
  const task: Task = { ...input, id: makeId("task"), createdAt: now, updatedAt: now };
  const db = { ...state.db, tasks: [...state.db.tasks, task] };
  persistDb(db);
  setState({ db });
  return task;
}

export function updateTask(id: string, patch: Partial<TaskInput>) {
  const db = {
    ...state.db,
    tasks: state.db.tasks.map((t) =>
      t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t
    ),
  };
  persistDb(db);
  setState({ db });
}

export function deleteTask(id: string) {
  const db = { ...state.db, tasks: state.db.tasks.filter((t) => t.id !== id) };
  const prefs = { ...state.prefs, done: state.prefs.done.filter((d) => d !== id) };
  persistDb(db);
  persistPrefs(prefs);
  setState({ db, prefs });
}

export type ClassInput = Omit<SchoolClass, "id">;

export function addClass(input: ClassInput): SchoolClass {
  const cls: SchoolClass = { ...input, id: makeId("cls") };
  const db = { ...state.db, classes: [...state.db.classes, cls] };
  persistDb(db);
  setState({ db });
  return cls;
}

export function updateClass(id: string, patch: Partial<ClassInput>) {
  const db = {
    ...state.db,
    classes: state.db.classes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
  persistDb(db);
  setState({ db });
}

/** Deleting a class also removes its tasks. */
export function deleteClass(id: string) {
  const db = {
    ...state.db,
    classes: state.db.classes.filter((c) => c.id !== id),
    tasks: state.db.tasks.filter((t) => t.classId !== id),
  };
  persistDb(db);
  setState({ db });
}

export function resetDatabase() {
  const db = buildSeedDatabase(new Date());
  persistDb(db);
  const prefs = { ...state.prefs, done: [] };
  persistPrefs(prefs);
  setState({ db, prefs });
}

// ---------------------------------------------------------------- admin

const ADMIN_PASSCODE = process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "tapulan-admin";

/**
 * NOTE: this is a client-side convenience gate for the demo deployment,
 * not real authentication. Wire a proper backend before trusting it.
 */
export function unlockAdmin(passcode: string): boolean {
  if (passcode.trim() !== ADMIN_PASSCODE) return false;
  try {
    window.sessionStorage.setItem(ADMIN_KEY, "1");
  } catch {
    // ignore
  }
  setState({ admin: true });
  return true;
}

export function lockAdmin() {
  try {
    window.sessionStorage.removeItem(ADMIN_KEY);
  } catch {
    // ignore
  }
  setState({ admin: false });
}

// -------------------------------------------------------- import/export

export function exportJson(): string {
  return JSON.stringify(state.db, null, 2);
}

export function importJson(raw: string): { ok: boolean; error?: string } {
  try {
    const parsed = JSON.parse(raw) as Database;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.classes) ||
      !Array.isArray(parsed.tasks)
    ) {
      return { ok: false, error: "File does not look like a Tapulan export." };
    }
    const db: Database = {
      version: DB_VERSION,
      classes: parsed.classes,
      tasks: parsed.tasks,
    };
    persistDb(db);
    setState({ db });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not parse JSON." };
  }
}
