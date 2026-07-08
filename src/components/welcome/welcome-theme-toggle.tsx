"use client";

import { Moon, Sun, Sunset } from "lucide-react";
import { useTheme } from "next-themes";
import { cycleTheme } from "@/components/shell/theme-toggle";

/**
 * Compact icon toggle for the landing masthead — the same light → dark → sepia
 * cycle and CSS icon swap the shell uses, sized as an inline control instead of
 * a sidebar rail row. No mounted-state dance: the icon flips on the theme
 * class, so there's no flash.
 */
export function WelcomeThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label="Switch theme (light, dark, or sepia)"
      onClick={() => cycleTheme(setTheme)}
      className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--r-control)] text-muted transition-[color,background-color,transform] duration-[var(--dur-1)] before:absolute before:-inset-2 before:content-[''] hover:bg-surface-2 hover:text-ink active:scale-95 active:duration-[var(--dur-0)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)] lg:before:hidden"
    >
      <Sun className="size-4 dark:hidden sepia:hidden" strokeWidth={1.75} />
      <Moon className="hidden size-4 dark:block" strokeWidth={1.75} />
      <Sunset className="hidden size-4 sepia:block" strokeWidth={1.75} />
    </button>
  );
}
