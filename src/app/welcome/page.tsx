import type { Metadata } from "next";

import { getDayMark, getPeriods, getSettings, getStrands, getTasks } from "@/lib/queries";
import { resolveScheduleDay } from "@/lib/domain/schedule";
import { toISODate } from "@/lib/domain/time";
import { sectionStatus } from "@/lib/domain/welcome";
import { WelcomeCover } from "@/components/welcome/welcome-cover";

// The clock and the section's live state must be honest per request, so this
// route is never statically cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome",
  description:
    "Pick your strand and open your section's schedule and requirements. No account, no sign-in.",
  // A first-run onboarding gate, not a page worth indexing.
  robots: { index: false, follow: false },
};

export default function WelcomePage() {
  const now = new Date();
  const settings = getSettings();
  const strands = getStrands();

  // Same day resolution the Today view uses (today on weekdays, else the coming
  // Monday), so the colophon's "as of" line previews what the app will show.
  const { date } = resolveScheduleDay(now);
  const mark = getDayMark(toISODate(date));
  const status = sectionStatus(getPeriods(null), mark, getTasks(null), now);

  return <WelcomeCover settings={settings} strands={strands} status={status} />;
}
