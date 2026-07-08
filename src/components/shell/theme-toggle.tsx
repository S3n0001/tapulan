"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Dark ↔ light. Mirrors the sidebar's nav / admin rows: a full labeled row
 * when the sidebar is open ("Light mode" / "Dark mode"), a centered icon
 * circle when it's collapsed. Icon + label swap via CSS (`dark:` variants),
 * so there's no hydration flash and no mounted-state dance.
 */
export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const { setTheme } = useTheme();
  return (
    <button
      type="button"
      aria-label="Toggle light / dark theme"
      title={collapsed ? "Toggle theme" : undefined}
      onClick={() =>
        setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")
      }
      className={cn(
        "rail-morph flex w-full items-center gap-2.5 overflow-hidden whitespace-nowrap px-2.5 text-[13px] font-medium text-muted hover:bg-surface hover:text-ink",
        collapsed ? "h-9 rounded-full" : "h-8 rounded-[6px]"
      )}
    >
      <Sun className="size-4 shrink-0 dark:hidden" strokeWidth={1.75} />
      <Moon className="hidden size-4 shrink-0 dark:block" strokeWidth={1.75} />
      <span
        className={cn(
          "flex-1 text-left transition-opacity duration-[var(--dur-2)]",
          collapsed && "opacity-0"
        )}
      >
        <span className="dark:hidden">Light mode</span>
        <span className="hidden dark:inline">Dark mode</span>
      </span>
    </button>
  );
}
