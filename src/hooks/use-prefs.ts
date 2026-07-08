"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Device-local display preferences — kept per device in localStorage, the same
 * pattern as the personal "done" ticks ([[use-done]]). Nothing here touches the
 * shared section data; it only tunes how *this* device shows it. One store so
 * every surface (Today's due horizon, the Tasks filter, the materials viewer,
 * the Settings page) stays in lockstep and a change on one reflects on the rest.
 */

export type Horizon = 7 | 14 | 30;

export interface Prefs {
  /** Today's "due soon" window, in days */
  horizon: Horizon;
  /** the Tasks list shows done & cancelled by default */
  showDone: boolean;
  /** open task materials in a new browser tab instead of the in-app viewer */
  materialsNewTab: boolean;
}

const KEY = "tapulan.prefs.v1";
const DEFAULTS: Prefs = { horizon: 7, showDone: false, materialsNewTab: false };

const listeners = new Set<() => void>();
let cache: Prefs | null = null;

/** Tolerant parse: an unknown/partial blob degrades to defaults, never throws. */
function coerce(raw: unknown): Prefs {
  const v = (raw && typeof raw === "object" ? raw : {}) as Partial<Prefs>;
  return {
    horizon: v.horizon === 14 || v.horizon === 30 ? v.horizon : 7,
    showDone: v.showDone === true,
    materialsNewTab: v.materialsNewTab === true,
  };
}

function read(): Prefs {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? coerce(JSON.parse(raw)) : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache;
}

function write(next: Prefs) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked — keep the in-memory copy for this session
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // a change in another tab re-reads from storage and re-renders here too
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePrefs() {
  // getServerSnapshot returns DEFAULTS; useSyncExternalStore swaps to the
  // stored value on hydration without a mismatch warning (see use-done)
  const prefs = useSyncExternalStore(subscribe, read, () => DEFAULTS);

  const setPref = useCallback(<K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    write({ ...read(), [key]: value });
  }, []);

  return { prefs, setPref };
}
