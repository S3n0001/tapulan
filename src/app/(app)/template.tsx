/**
 * Route content fades up on navigation. A template (not the layout) re-mounts
 * per route, so this wraps only the swapped view — the shell stays put.
 * Collapses to an opacity-only no-op under `prefers-reduced-motion`.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  // This wrapper has to carry the flex chain through on BOTH breakpoints:
  // <main> is a flex column, so the wrapper must itself be a full-height flex
  // column for a view's `flex-1` to actually fill the panel. Left as a plain
  // block it collapsed to its content height, stranding dead space beneath
  // every short view (the mobile "black spot" below a light day / short list).
  //   • mobile — `flex-1` fills <main>, but a flex item's default
  //     `min-height: auto` still lets a taller page grow past it and scroll.
  //   • desktop — `lg:h-full` + `lg:flex-initial` pin a definite height so the
  //     panel's own `overflow-y-auto` scrolls internally (unchanged behavior).
  return (
    <div className="anim-view flex flex-1 flex-col lg:h-full lg:flex-initial">{children}</div>
  );
}
