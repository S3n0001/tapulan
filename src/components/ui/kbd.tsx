import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-[4px] border border-line bg-surface px-1 font-sans text-[11px] font-medium leading-none text-faint shadow-[inset_0_-1px_0_var(--line-strong)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
