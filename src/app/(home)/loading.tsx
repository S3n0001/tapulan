import { Toolbar } from "@/components/shell/toolbar";
import { Skeleton } from "@/components/ui/skeleton";

/** Today, loading — mirrors the now-card + timeline + due-soon rail geometry. */

const ROW_W = ["58%", "44%", "66%", "38%", "71%", "49%", "55%"];
const META_W = ["34%", "42%", "28%", "38%", "31%", "44%", "36%"];

export default function TodayLoading() {
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">
        Loading today&apos;s schedule…
      </span>
      <Toolbar title="Today" meta={<Skeleton className="h-3 w-24" />} />

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_336px]">
        <section className="min-w-0 lg:border-r lg:border-line">
          {/* now-card */}
          <div className="p-3.5 lg:p-4">
            <div className="rounded-[var(--r-card)] border border-line bg-surface px-3.5 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-1.5 rounded-full" />
                <Skeleton className="h-2.5 w-8" />
                <Skeleton className="ml-auto h-3 w-14" />
              </div>
              <Skeleton className="mt-2.5 h-4 w-[62%] max-w-72" />
              <Skeleton className="mt-2 h-3 w-[40%] max-w-48" />
              <Skeleton className="mt-3 h-[3px] w-full rounded-full" />
            </div>
          </div>

          {/* timeline rows (a dotted break line between class rows) */}
          <div className="pb-4">
            {ROW_W.map((w, i) =>
              i === 2 || i === 5 ? (
                <div key={i} className="flex h-8 items-center gap-3 px-3.5 lg:px-4">
                  <span className="w-[46px] shrink-0">
                    <Skeleton className="ml-auto h-2.5 w-7" />
                  </span>
                  <Skeleton className="h-2.5 w-12" />
                  <span
                    className="h-px flex-1 border-t border-dotted border-line-strong/70"
                    aria-hidden
                  />
                </div>
              ) : (
                <div key={i} className="flex min-h-[50px] items-center gap-3 px-3.5 py-1.5 lg:px-4">
                  <span className="w-[46px] shrink-0 space-y-1">
                    <Skeleton className="ml-auto h-3 w-8" />
                    <Skeleton className="ml-auto h-2.5 w-7" />
                  </span>
                  <Skeleton className="size-2 shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 max-w-72" style={{ width: w }} />
                    <Skeleton className="h-2.5 max-w-44" style={{ width: META_W[i] }} />
                  </span>
                  <Skeleton className="h-3 w-9 shrink-0" />
                </div>
              )
            )}
          </div>
        </section>

        {/* due-soon rail */}
        <aside className="border-t border-line lg:border-t-0">
          <div className="flex h-9 items-center gap-2 border-b border-line/70 px-3.5 lg:px-4">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="ml-auto h-2.5 w-14" />
          </div>
          <div className="divide-y divide-line/60">
            {["72%", "51%", "64%"].map((w, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3.5 py-2 lg:px-4">
                <Skeleton className="size-4 shrink-0 rounded-[4px]" />
                <Skeleton className="h-[18px] w-10 shrink-0 rounded-[4px]" />
                <span className="min-w-0 flex-1 space-y-1">
                  <Skeleton className="h-3 max-w-56" style={{ width: w }} />
                  <Skeleton className="h-2.5 w-12" />
                </span>
                <Skeleton className="h-3 w-12 shrink-0" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
