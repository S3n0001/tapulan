import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[13px] font-medium text-muted">Tapulan</p>
      <h1 className="text-xl font-semibold tracking-[-0.015em] text-ink">Page not found.</h1>
      <p className="max-w-sm text-[13px] leading-relaxed text-faint">
        This page doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--r-control)] border border-transparent bg-brand px-3 text-[13px] font-medium text-on-brand shadow-[inset_0_1px_0_oklch(1_0_0/0.08)] transition-[background-color,transform] duration-[var(--dur-1)] hover:bg-brand-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)] focus-visible:ring-offset-1 focus-visible:ring-offset-bg"
      >
        Back to Today
      </Link>
    </div>
  );
}
