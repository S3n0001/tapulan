import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="flex size-9 items-center justify-center rounded-[var(--r-card)] border border-line bg-surface text-muted">
        <Icon className="size-4.5" strokeWidth={1.75} />
      </div>
      <h3 className="mt-3 text-[13.5px] font-medium text-ink">{title}</h3>
      {children && (
        <p className="mt-1 max-w-[38ch] text-[12.5px] leading-relaxed text-muted">{children}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
