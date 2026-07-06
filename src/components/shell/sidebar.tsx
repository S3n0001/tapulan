"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Search } from "lucide-react";
import type { Settings, Strand, StrandCode } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import { useIsAdmin } from "./admin-context";
import { NAV, isNavActive } from "./nav";
import { StrandSwitcher } from "./strand-switcher";
import { ThemeToggle } from "./theme-toggle";
import { openPalette } from "./command-palette";

export function Sidebar({
  strands,
  current,
  settings,
  openCount,
}: {
  strands: Strand[];
  current: StrandCode | null;
  settings: Settings;
  openCount: number;
}) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col gap-0.5 px-3 pb-3 pt-2.5 lg:flex">
      <StrandSwitcher
        strands={strands}
        current={current}
        sectionLabel={[settings.sectionName, settings.schoolYear].filter(Boolean).join(" · ")}
        variant="sidebar"
      />

      <button
        type="button"
        onClick={openPalette}
        className="tap mt-2 flex h-8 items-center gap-2 rounded-[var(--r-control)] border border-line bg-surface px-2.5 text-[12.5px] text-faint transition-[color,background-color,border-color,transform] duration-[var(--dur-1)] hover:border-line-strong hover:text-muted"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search…</span>
        <Kbd>⌘K</Kbd>
      </button>

      <nav aria-label="Views" className="mt-3 flex flex-col gap-[3px]">
        {NAV.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "tap flex h-[30px] items-center gap-2.5 rounded-[6px] px-2 text-[13px] font-medium transition-[color,background-color,transform] duration-[var(--dur-1)]",
                active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface hover:text-ink"
              )}
            >
              <item.icon className="size-4" strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              {item.href === "/tasks" && openCount > 0 && (
                <span className="tnum font-mono text-[11px] text-faint">{openCount}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-1 pt-3">
        {/* admin stays invisible to students — signed-in beadles get the shortcut */}
        {isAdmin ? (
          <Link
            href="/admin"
            aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            className={cn(
              "tap flex h-8 flex-1 items-center gap-2.5 rounded-[6px] px-2 text-[13px] font-medium transition-[color,background-color,transform] duration-[var(--dur-1)]",
              pathname.startsWith("/admin")
                ? "bg-surface-2 text-ink"
                : "text-muted hover:bg-surface hover:text-ink"
            )}
          >
            <Lock className="size-4" strokeWidth={1.75} />
            <span className="flex-1">Admin</span>
            <span className="size-1.5 rounded-full bg-ok" aria-label="Signed in" role="img" />
          </Link>
        ) : (
          <span className="flex-1" />
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}
