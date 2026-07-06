"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Personal "done for me" ticks, kept per device in localStorage — distinct
 * from a task's admin-set status. Lets a student check off their own
 * progress without touching the shared source of truth.
 */

const KEY = "tapulan.done.v1";
const listeners = new Set<() => void>();
let cache: ReadonlySet<number> | null = null;

function read(): ReadonlySet<number> {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as number[]) : [];
    cache = new Set(Array.isArray(arr) ? arr : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

function write(next: Set<number>) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    // storage blocked — keep the in-memory copy for this session
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
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

const EMPTY: ReadonlySet<number> = new Set();

export function useDone() {
  const done = useSyncExternalStore(
    subscribe,
    read,
    () => EMPTY
  );

  const toggle = useCallback((id: number) => {
    const next = new Set(read());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    write(next);
  }, []);

  const isDone = useCallback((id: number) => done.has(id), [done]);

  return { done, isDone, toggle };
}
