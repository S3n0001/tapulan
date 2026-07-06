"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { IconButton } from "@/components/ui/icon-button";

/**
 * Dark ↔ light. Icons swap via CSS (`dark:` variants), so there's no
 * hydration flash and no mounted-state dance.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { setTheme } = useTheme();
  return (
    <IconButton
      aria-label="Toggle light / dark theme"
      className={className}
      onClick={() =>
        setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")
      }
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </IconButton>
  );
}
