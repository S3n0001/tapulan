/**
 * Route content fades up on navigation. A template (not the layout) re-mounts
 * per route, so this wraps only the swapped view — the shell stays put.
 * Collapses to an opacity-only no-op under `prefers-reduced-motion`.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  // lg:h-full so full-height views (the week canvas) can size to the panel;
  // taller pages simply overflow it and scroll in <main> as before
  return <div className="anim-view lg:h-full">{children}</div>;
}
