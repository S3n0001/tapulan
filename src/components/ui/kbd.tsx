import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: string; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-line bg-surface px-1 font-mono text-[10.5px] font-medium text-faint shadow-[inset_0_-1px_0_var(--line-strong)]",
        className
      )}
    >
      {children}
    </kbd>
  );
}
