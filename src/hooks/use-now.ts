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
    const tick = () => setNow(new Date());
    tick(); // correct to real client time immediately after hydration
    const id = window.setInterval(tick, intervalMs);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);

  return now;
}
