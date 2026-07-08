"use client";

import { Moon, Sun, Sunset } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/** Light → dark → sepia → light, read off the <html> class so the visual state
 * (not the stored "system") drives the step. Shared by every toggle. */
export function cycleTheme(setTheme: (theme: string) => void): void {
  const cls = document.documentElement.classList;
  setTheme(cls.contains("dark") ? "sepia" : cls.contains("theme-sepia") ? "light" : "dark");
}

/**
 * Cycles light → dark → sepia. Mirrors the sidebar's nav / admin rows: a full
 * labeled row when the sidebar is open ("Light mode" / "Dark mode" / "Sepia
 * mode"), a centered icon circle when it's collapsed. Icon + label swap via CSS
 * (`dark:` / `sepia:` variants), so there's no hydration flash and no
 * mounted-state dance.
 */
export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label="Switch theme (light, dark, or sepia)"
      title={collapsed ? "Switch theme" : undefined}
      onClick={() => cycleTheme(setTheme)}
      className={cn(
        "rail-morph flex w-full items-center gap-2.5 overflow-hidden whitespace-nowrap px-2.5 text-[13px] font-medium text-muted hover:bg-surface hover:text-ink",
        collapsed ? "h-9 rounded-full" : "h-8 rounded-full"
      )}
    >
      <Sun className="size-4 shrink-0 dark:hidden sepia:hidden" strokeWidth={1.75} />
      <Moon className="hidden size-4 shrink-0 dark:block" strokeWidth={1.75} />
      <Sunset className="hidden size-4 shrink-0 sepia:block" strokeWidth={1.75} />
      <span
        className={cn(
          "flex-1 text-left transition-opacity duration-[var(--dur-2)]",
          collapsed && "opacity-0"
        )}
      >
        <span className="dark:hidden sepia:hidden">Light mode</span>
        <span className="hidden dark:inline">Dark mode</span>
        <span className="hidden sepia:inline">Sepia mode</span>
      </span>
    </button>
  );
}
