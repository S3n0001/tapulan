import { Lock } from "lucide-react";
import { ViewChrome } from "@/components/shell/view-chrome";
import { Skeleton } from "@/components/ui/skeleton";

/** Admin, loading — toolbar, tab strip, and a neutral row list. */

export default function AdminLoading() {
  return (
    <ViewChrome
      title="Admin"
      icon={Lock}
      right={<Skeleton className="h-7 w-[76px] rounded-[var(--r-control)]" />}
      subrow={
        <div className="flex items-center gap-1 px-2 lg:px-2.5" aria-hidden>
          {["w-12", "w-16", "w-16", "w-14"].map((w, i) => (
            <span key={i} className="flex h-[33px] items-center px-2 pb-2.5 pt-1">
              <Skeleton className={`h-3.5 ${w}`} />
            </span>
          ))}
        </div>
      }
    >
      <span role="status" className="sr-only">
        Loading admin…
      </span>

      <div>
        <div className="flex h-11 items-center gap-2 border-b border-line px-3.5 lg:px-4">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="ml-auto h-6 w-24 rounded-[var(--r-control)]" />
        </div>
        <div className="divide-y divide-line/80">
          {["48%", "62%", "39%", "55%"].map((w, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-2 lg:h-9 lg:px-4 lg:py-0">
              <Skeleton className="size-[18px] shrink-0 rounded-[5px]" />
              <Skeleton className="h-[18px] w-11 shrink-0 rounded-[4px]" />
              <Skeleton className="h-3.5 max-w-80" style={{ width: w }} />
              <Skeleton className="ml-auto h-3 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </ViewChrome>
  );
}
