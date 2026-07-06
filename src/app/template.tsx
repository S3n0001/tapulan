/**
 * Route content fades up on navigation. A template (not the layout) re-mounts
 * per route, so this wraps only the swapped view — the shell stays put.
 * Collapses to an opacity-only no-op under `prefers-reduced-motion`.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="anim-view">{children}</div>;
}
