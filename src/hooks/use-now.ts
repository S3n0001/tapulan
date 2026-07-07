"use client";

import { useEffect, useState } from "react";

/**
 * Live clock. Seeded with the server's timestamp so the first client render
 * matches SSR (no hydration mismatch), then it self-corrects to real device
 * time on mount and ticks. Pauses updates while the tab is hidden.
 */
export function useNow(initialISO: string, intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date(initialISO));

  useEffect(() => {
    let intervalId: number | undefined;
    const tick = () => setNow(new Date());
    tick(); // correct to real client time immediately after hydration
    // align the first tick to the next wall-clock boundary so the minute
    // flips *with* the clock, not up to a full interval late
    const delay = intervalMs - (Date.now() % intervalMs);
    const timeoutId = window.setTimeout(() => {
      tick();
      intervalId = window.setInterval(tick, intervalMs);
    }, delay);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return now;
}
