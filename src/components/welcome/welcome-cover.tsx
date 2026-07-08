import type { SectionStatus } from "@/lib/domain/welcome";
import type { Settings, Strand } from "@/lib/domain/types";
import { WelcomeThemeToggle } from "./welcome-theme-toggle";
import { StrandPicker } from "./strand-picker";
import { SectionStatusLine } from "./section-status-line";
import { CapabilityLegend } from "./capability-legend";

/**
 * The landing's "inside cover": a single elevated panel on the app void, entering
 * with the app's own anim-view so opening /welcome feels like opening a view, not
 * arriving at a splash. The real section identity is the only large element —
 * identity, never a slogan or a metric. Everything below the masthead is a quiet
 * ledger band: one sentence, the strand picker, and a single honest colophon.
 *
 * Section-agnostic by construction — the identity, the strands, and the live
 * status all arrive from the database, so another section reuses it unchanged.
 */
export function WelcomeCover({
  settings,
  strands,
  status,
}: {
  settings: Settings;
  strands: Strand[];
  status: SectionStatus;
}) {
  const { sectionName, schoolYear } = settings;
  const strandCount = strands.length;
  const range = strandCount > 1 ? `1–${strandCount}` : "1";

  return (
    <div className="anim-view flex min-h-dvh w-full flex-col bg-bg px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] lg:min-h-0 lg:max-w-[560px] lg:rounded-[var(--r-panel)] lg:border lg:border-line lg:px-8 lg:py-9 lg:shadow-[var(--shadow-pop)]">
        {/* masthead — identity is the hero */}
        <header className="flex flex-col gap-4 border-b border-line pb-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-medium text-muted">
              {sectionName ? "Tapulan · section logbook" : <span className="sr-only">Tapulan</span>}
            </p>
            <WelcomeThemeToggle />
          </div>
          <div>
            <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.015em] text-ink">
              {sectionName || "Tapulan"}
            </h1>
            {(schoolYear || !sectionName) && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11.5px] uppercase tracking-[0.06em] text-faint">
                {!sectionName && <span>Section logbook</span>}
                {schoolYear && <span className="tnum">{schoolYear}</span>}
              </p>
            )}
          </div>
        </header>

        {/* statement + strand picker */}
        <div className="flex flex-col gap-7 py-6">
          <div className="flex flex-col gap-2">
            <p className="text-[14.5px] leading-relaxed text-ink">
              The section’s weekly schedule and every requirement, kept in one honest place.
              What’s now, what’s next, what’s due.
            </p>
            <p className="text-[12.5px] leading-relaxed text-muted">
              Tapulan is Bisaya for <em className="text-ink">lazy</em>. The plan is to let the
              logbook do the remembering, so you don’t have to.
            </p>
          </div>

          <section className="flex flex-col gap-3" aria-labelledby="welcome-picker-heading">
            <div>
              <h2 id="welcome-picker-heading" className="text-[12px] font-medium text-muted">
                Which strand is yours?
              </h2>
              <p className="mt-1 text-[12px] leading-relaxed text-faint">
                Pick yours to see just your own timetable and requirements. It’s only a filter, so
                you can switch anytime from the sidebar.
              </p>
            </div>
            <StrandPicker strands={strands} />
          </section>
        </div>

        {/* colophon — below the line */}
        <footer className="mt-auto flex flex-col gap-3 border-t border-line pt-6">
          <p className="font-mono text-[11px] leading-relaxed text-muted">
            No account, no sign-in. Tapulan stays on this device and remembers for you.
          </p>
          <SectionStatusLine status={status} />
          <CapabilityLegend />
          {strandCount > 0 && (
            <p className="hidden font-mono text-[11px] text-faint lg:block">
              <span className="tnum">{range}</span> pick a strand
              <span className="mx-1.5 text-line-strong">·</span>
              <span className="tnum">0</span> whole section
              <span className="mx-1.5 text-line-strong">·</span>↵ enter
            </p>
          )}
        </footer>
      </div>
  );
}
