import { useEffect, useState } from "react";

/**
 * Keep a node mounted through its exit animation. Returns `mounted` (render
 * the node while true) and `state` ("open" | "closed") to drive a
 * `[data-state]` selector. When `open` flips false the node stays for `ms`
 * with state="closed" so the exit keyframes can play, then unmounts.
 */
export function usePresence(open: boolean, ms = 180) {
  const [mounted, setMounted] = useState(open);
  const [state, setState] = useState<"open" | "closed">(open ? "open" : "closed");

  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => setState("open"));
      return () => cancelAnimationFrame(r);
    }
    setState("closed");
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);

  return { mounted, state };
}
