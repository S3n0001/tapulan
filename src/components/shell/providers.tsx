"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, type ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";
import { ConfirmProvider } from "@/components/ui/confirm";
import { AdminProvider } from "./admin-context";

/**
 * App-wide theming. Wraps every route at the root — the app shell AND the
 * login-free landing — so the theme class is on <html> before first paint and
 * the theme toggle works everywhere. Light stays the persisted default; sepia
 * is the third, light-family choice (tokens in globals.css).
 */
export function RootProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      themes={["light", "dark", "sepia"]}
      // The sepia theme's <html> class must NOT be `sepia` — Tailwind ships a
      // `sepia` filter utility, and that class on the root colour-washes the
      // whole app. The theme keeps its name; only the class is remapped.
      value={{ light: "light", dark: "dark", sepia: "theme-sepia" }}
      enableSystem
      disableTransitionOnChange
    >
      <MetaThemeColor />
      {children}
    </ThemeProvider>
  );
}

/**
 * Keeps the browser-chrome color (Android address bar, iOS Safari tint) on the
 * active theme's `--bg` — the surface the mobile top bar sits on. The static
 * media-query metas in the root layout only know system light/dark, so a manual
 * choice (especially sepia, which has no media representation) would otherwise
 * leave mismatched chrome over the panel. Values mirror globals.css.
 */
const THEME_COLOR: Record<string, string> = {
  light: "#fdfdfd",
  dark: "#101112",
  sepia: "#ffebd5",
};

function MetaThemeColor() {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    const color = resolvedTheme ? THEME_COLOR[resolvedTheme] : undefined;
    if (!color) return;
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute("content", color));
  }, [resolvedTheme]);
  return null;
}

/**
 * Interactive-app providers. Only the shell needs toasts, confirmations, and
 * admin state; the landing stays lightweight without them.
 */
export function AppProviders({ isAdmin, children }: { isAdmin: boolean; children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminProvider value={isAdmin}>{children}</AdminProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
