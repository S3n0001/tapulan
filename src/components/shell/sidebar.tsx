"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, PanelLeftClose, PanelLeftOpen, Search, SlidersHorizontal } from "lucide-react";
import type { Settings, Strand, StrandCode } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { Kbd } from "@/components/ui/kbd";
import { useIsAdmin } from "./admin-context";
import { NAV, isNavActive } from "./nav";
import { StrandSwitcher } from "./strand-switcher";
import { ThemeToggle } from "./theme-toggle";
import { openPalette } from "./command-palette";
import { openSettings } from "@/components/settings/settings-modal";

/** Cookie so the server renders the right width — no expand/collapse flash. */
const COLLAPSE_COOKIE = "tapulan.sidebar";

export function Sidebar({
  strands,
  current,
  settings,
  openCount,
  defaultCollapsed = false,
}: {
  strands: Strand[];
  current: StrandCode | null;
  settings: Settings;
  openCount: number;
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      document.cookie = `${COLLAPSE_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });

  // ⌘B / Ctrl+B, the sidebar shortcut every editor trained us on
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Both states share one geometry: every row keeps its height and padding,
  // icons sit in a fixed 28px-center column, and only the aside width
  // animates — labels fade out instead of reflowing.
  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col gap-0.5 px-2.5 pb-3 pt-2.5 transition-[width] duration-[var(--dur-2)] lg:flex",
        collapsed ? "w-[56px]" : "w-[220px]"
      )}
    >
      <div className="relative flex h-10 shrink-0 items-center">
        {/* Strand switcher spans the full sidebar width, matching the search field below. */}
        <div
          inert={collapsed}
          className={cn(
            "min-w-0 flex-1 transition-opacity duration-[var(--dur-2)]",
            collapsed && "opacity-0"
          )}
        >
          <StrandSwitcher
            strands={strands}
            current={current}
            sectionLabel={[settings.sectionName, settings.schoolYear].filter(Boolean).join(" · ")}
            variant="sidebar"
          />
        </div>

        {/* Collapse toggle floats at the trailing edge when expanded, recenters in the rail when collapsed. */}
        <button
          type="button"
          onClick={toggle}
          title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘B)`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className={cn(
            "tap inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-[color,background-color,transform] duration-[var(--dur-1)] hover:bg-surface-2 hover:text-ink",
            collapsed ? "mx-auto" : "absolute right-0 top-1/2 z-10 -translate-y-1/2"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px]" strokeWidth={1.75} />
          ) : (
            <PanelLeftClose className="size-[18px]" strokeWidth={1.75} />
          )}
        </button>
      </div>

      {/* Rail-mode strand badge: the slot animates open in sync with the width,
          so the rows below slide rather than jump. */}
      <div
        inert={!collapsed}
        className={cn(
          "flex shrink-0 justify-center transition-[height,opacity,margin] duration-[var(--dur-2)]",
          collapsed ? "mt-1 h-9" : "h-0 overflow-hidden opacity-0"
        )}
      >
        <StrandSwitcher strands={strands} current={current} variant="sidebar" collapsed />
      </div>

      <button
        type="button"
        onClick={openPalette}
        title={collapsed ? "Search (⌘K)" : undefined}
        aria-label="Search"
        className={cn(
          "rail-morph mt-2 flex shrink-0 items-center gap-2 overflow-hidden whitespace-nowrap border px-[9px] text-[12.5px] text-faint",
          collapsed
            ? "h-9 rounded-full border-transparent hover:bg-surface-2 hover:text-muted"
            : "h-8 rounded-full border-line bg-surface hover:border-line-strong hover:text-muted"
        )}
      >
        <Search className="size-4 shrink-0" />
        <span
          className={cn(
            "flex-1 text-left transition-opacity duration-[var(--dur-2)]",
            collapsed && "opacity-0"
          )}
        >
          Search…
        </span>
        <span
          className={cn(
            "flex items-center gap-0.5 transition-opacity duration-[var(--dur-2)]",
            collapsed && "opacity-0"
          )}
        >
          <Kbd>
            <span className="text-[9.5px] leading-none">⌘</span>
          </Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <nav aria-label="Views" className="mt-3 flex flex-col gap-[3px]">
        {NAV.map((item) => {
          const active = isNavActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "rail-morph relative flex items-center gap-2.5 overflow-hidden whitespace-nowrap px-2.5 text-[13px] font-medium",
                collapsed ? "h-9 rounded-full" : "h-[30px] rounded-full",
                active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface hover:text-ink"
              )}
            >
              <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
              <span
                className={cn(
                  "flex-1 transition-opacity duration-[var(--dur-2)]",
                  collapsed && "opacity-0"
                )}
              >
                {item.label}
              </span>
              {item.href === "/tasks" && openCount > 0 && (
                <>
                  <span
                    className={cn(
                      "tnum font-mono text-[11px] text-faint transition-opacity duration-[var(--dur-2)]",
                      collapsed && "opacity-0"
                    )}
                  >
                    {openCount}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-1 top-1 size-1.5 rounded-full bg-brand transition-opacity duration-[var(--dur-2)]",
                      !collapsed && "opacity-0"
                    )}
                  />
                </>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-3">
        <button
          type="button"
          onClick={openSettings}
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "rail-morph relative flex items-center gap-2.5 overflow-hidden whitespace-nowrap px-2.5 text-[13px] font-medium text-muted hover:bg-surface hover:text-ink",
            collapsed ? "h-9 rounded-full" : "h-8 rounded-full"
          )}
        >
          <SlidersHorizontal className="size-4 shrink-0" strokeWidth={1.75} />
          <span
            className={cn(
              "flex-1 text-left transition-opacity duration-[var(--dur-2)]",
              collapsed && "opacity-0"
            )}
          >
            Settings
          </span>
        </button>
        {/* admin stays invisible to students — signed-in beadles get the shortcut */}
        {isAdmin && (
          <Link
            href="/admin"
            aria-current={pathname.startsWith("/admin") ? "page" : undefined}
            title={collapsed ? "Admin" : undefined}
            className={cn(
              "rail-morph relative flex items-center gap-2.5 overflow-hidden whitespace-nowrap px-2.5 text-[13px] font-medium",
              collapsed ? "h-9 rounded-full" : "h-8 rounded-full",
              pathname.startsWith("/admin")
                ? "bg-surface-2 text-ink"
                : "text-muted hover:bg-surface hover:text-ink"
            )}
          >
            <Lock className="size-4 shrink-0" strokeWidth={1.75} />
            <span
              className={cn(
                "flex-1 transition-opacity duration-[var(--dur-2)]",
                collapsed && "opacity-0"
              )}
            >
              Admin
            </span>
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full bg-ok transition-opacity duration-[var(--dur-2)]",
                collapsed && "opacity-0"
              )}
              aria-label="Signed in"
              role="img"
            />
            <span
              aria-hidden
              className={cn(
                "absolute right-1 top-1 size-1.5 rounded-full bg-ok transition-opacity duration-[var(--dur-2)]",
                !collapsed && "opacity-0"
              )}
            />
          </Link>
        )}
        <ThemeToggle collapsed={collapsed} />
      </div>
    </aside>
  );
}
