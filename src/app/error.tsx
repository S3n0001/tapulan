'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-medium text-muted">Tapulan</p>
      <h1 className="text-xl font-semibold text-ink">Something broke on this page.</h1>
      <p className="max-w-sm text-sm text-faint">
        The error has been logged. Try again, or head back and pick up where you left off.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
