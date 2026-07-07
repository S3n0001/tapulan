"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Search } from "lucide-react";
import type { Strand, StrandCode } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/icon-button";
import { useIsAdmin } from "./admin-context";
import { NAV, isNavActive, viewTitle } from "./nav";
import { StrandSwitcher } from "./strand-switcher";
import { openPalette } from "./command-palette";

/** Slim mobile top bar: the current view's name + the three global controls. */
export function MobileTopBar({
  strands,
  current,
}: {
  strands: Strand[];
  current: StrandCode | null;
}) {
  const pathname = usePathname();
  const isAdmin = useIsAdmin();

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-bg/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
        {viewTitle(pathname)}
      </h1>
      <StrandSwitcher strands={strands} current={current} variant="chip" />
      <IconButton aria-label="Search" onClick={openPalette}>
        <Search className="size-4" />
      </IconButton>
      {/* hidden from students — appears only for a signed-in admin */}
      {isAdmin && (
        <Link
          href="/admin"
          aria-label="Admin (signed in)"
          className="relative inline-flex size-7 items-center justify-center rounded-[var(--r-control)] text-muted transition-[color,background-color,transform] hover:bg-surface-2 hover:text-ink active:scale-95"
        >
          <Lock className="size-4" />
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-ok" />
        </Link>
      )}
    </header>
  );
}

/** Bottom tab bar — one-thumb navigation. */
export function MobileTabs({ openCount }: { openCount: number }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Views"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {NAV.map((item) => {
        const active = isNavActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-[52px] flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-[color,transform] duration-[var(--dur-1)] active:scale-95 active:duration-[var(--dur-0)]",
              active ? "text-brand-text" : "text-faint hover:text-muted"
            )}
          >
            <span className="relative">
              <item.icon
                className={cn(
                  "size-[19px] transition-transform duration-[var(--dur-2)] ease-[var(--ease)]",
                  active && "-translate-y-0.5"
                )}
                strokeWidth={active ? 2 : 1.75}
              />
              {item.href === "/tasks" && openCount > 0 && (
                <span
                  aria-label={`${openCount} open tasks`}
                  className="tnum absolute -right-2 -top-1 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-brand px-0.5 font-mono text-[9px] font-semibold leading-none text-on-brand"
                >
                  {openCount > 99 ? "99+" : openCount}
                </span>
              )}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
