import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-muted">Tapulan</p>
      <h1 className="text-xl font-semibold text-ink">Page not found.</h1>
      <p className="max-w-sm text-sm text-faint">
        This page doesn&apos;t exist or may have moved.
      </p>
      <Link
        href="/"
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--r-btn)] bg-accent px-3 text-sm font-medium text-accent-ink transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        Back to Today
      </Link>
    </div>
  );
}
