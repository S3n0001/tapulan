import { Library } from "lucide-react";
import { ViewChrome } from "@/components/shell/view-chrome";
import { Skeleton } from "@/components/ui/skeleton";

/** Classes, loading — grouped dense rows with the meet-dot column ghosted. */

const ROW_W = ["55%", "42%", "63%", "48%", "58%"];

function GhostRow({ w }: { w: string }) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 lg:h-11 lg:px-4 lg:py-0">
      <Skeleton className="size-2.5 shrink-0 rounded-[3.5px]" />
      <Skeleton className="h-3 w-11 shrink-0" />
      <span className="min-w-0 flex-1">
        <Skeleton className="h-3.5 max-w-72" style={{ width: w }} />
        <Skeleton className="mt-1 h-3 w-2/5 max-w-44 md:hidden" />
      </span>
      <Skeleton className="hidden h-3 w-24 shrink-0 md:block" />
      <Skeleton className="hidden h-3 w-10 shrink-0 sm:block" />
      <span className="hidden shrink-0 gap-[3px] lg:flex" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="size-[17px] rounded-[4px]" />
        ))}
      </span>
      <Skeleton className="h-3 w-[46px] shrink-0" />
    </div>
  );
}

export default function ClassesLoading() {
  return (
    <ViewChrome title="Classes" icon={Library} meta={<Skeleton className="h-3.5 w-16" />}>
      <span role="status" className="sr-only">
        Loading classes…
      </span>

      {[0, 1].map((section) => (
        <section key={section}>
          <div className="flex h-7 items-center gap-2 border-b border-line/70 bg-[color-mix(in_oklab,var(--surface)_45%,var(--bg))] px-3.5 lg:px-4">
            <Skeleton className="h-2.5 w-10" />
            <Skeleton className="h-2.5 w-14" />
          </div>
          <div className="divide-y divide-line/60">
            {ROW_W.slice(section * 2, section * 2 + 3).map((w, i) => (
              <GhostRow key={i} w={w} />
            ))}
          </div>
        </section>
      ))}
    </ViewChrome>
  );
}
