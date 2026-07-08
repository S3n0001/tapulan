'use client';

import { useEffect } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';

import { Button } from '@/components/ui/button';

import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export default function GlobalError({
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
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-shell text-ink antialiased`}>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm font-medium text-muted">Tapulan</p>
          <h1 className="text-xl font-semibold text-ink">Something broke on this page.</h1>
          <p className="max-w-sm text-sm text-faint">
            The app hit an unrecoverable error. Reloading usually fixes it.
          </p>
          <Button onClick={() => reset()}>Reload</Button>
        </div>
      </body>
    </html>
  );
}
