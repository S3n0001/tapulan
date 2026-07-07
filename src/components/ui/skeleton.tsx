import { cn } from "@/lib/utils";

/**
 * Loading placeholder — a hairline-tint block with a quiet opacity pulse
 * (`.skeleton` in globals.css; static under `prefers-reduced-motion`).
 * Skeletons copy the real view's geometry so the swap to content never
 * shifts layout. Purely decorative: hidden from the accessibility tree.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <span aria-hidden style={style} className={cn("skeleton block", className)} />;
}
