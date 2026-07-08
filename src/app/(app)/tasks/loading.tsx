import { ListTodo } from "lucide-react";
import { ViewChrome } from "@/components/shell/view-chrome";
import { Skeleton } from "@/components/ui/skeleton";

/** Tasks, loading — filter chips, a bucket header, and issue-tracker rows. */

const ROW_W = ["52%", "38%", "61%", "45%", "68%", "33%"];

function GhostRow({ w }: { w: string }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2 lg:h-9 lg:px-4 lg:py-0">
      <Skeleton className="size-[18px] shrink-0 rounded-[5px]" />
      <Skeleton className="h-[18px] w-11 shrink-0 rounded-[4px]" />
      <Skeleton className="h-3.5 max-w-80" style={{ width: w }} />
      <span className="ml-auto flex shrink-0 items-center gap-3">
        <Skeleton className="hidden h-3 w-12 sm:block" />
        <Skeleton className="h-3 w-16" />
      </span>
    </div>
  );
}

export default function TasksLoading() {
  return (
    <ViewChrome
      title="Tasks"
      icon={ListTodo}
      meta={<Skeleton className="h-3.5 w-12" />}
      right={<Skeleton className="h-4 w-28" />}
      subrow={
        <div className="flex items-center gap-1.5 px-3.5 pb-2.5 lg:px-4" aria-hidden>
          {["w-14", "w-20", "w-16", "w-24"].map((w, i) => (
            <Skeleton key={i} className={`h-6 ${w} rounded-[var(--r-chip)]`} />
          ))}
        </div>
      }
    >
      <span role="status" className="sr-only">
        Loading tasks…
      </span>

      {[0, 1].map((section) => (
        <section key={section}>
          <div className="flex h-7 items-center gap-2 border-b border-line/70 bg-[color-mix(in_oklab,var(--surface)_45%,var(--bg))] px-3.5 lg:px-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-2.5 w-3" />
          </div>
          <div className="divide-y divide-line/80">
            {ROW_W.slice(section * 3, section * 3 + 3).map((w, i) => (
              <GhostRow key={i} w={w} />
            ))}
          </div>
        </section>
      ))}
    </ViewChrome>
  );
}
