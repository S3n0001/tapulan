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
      // rAF lets the browser paint one "closed" frame first so the open
      // animation actually triggers — but rAF never fires in a hidden tab
      // (background tab, headless run), so a timeout backstop guarantees the
      // surface still opens there; whichever fires first wins
      let done = false;
      const commit = () => {
        if (done) return;
        done = true;
        setState("open");
      };
      const r = requestAnimationFrame(commit);
      const t = setTimeout(commit, 50);
      return () => {
        cancelAnimationFrame(r);
        clearTimeout(t);
      };
    }
    setState("closed");
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, ms]);

  return { mounted, state };
}
