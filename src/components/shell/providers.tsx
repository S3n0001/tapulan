"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";
import { AdminProvider } from "./admin-context";

export function Providers({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <ToastProvider>
        <ConfirmProvider>
          <AdminProvider value={isAdmin}>{children}</AdminProvider>
        </ConfirmProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
