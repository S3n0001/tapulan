import type { Metadata } from "next";
import { getPublishedCalendars } from "@/lib/queries";
import { manilaNow } from "@/lib/domain/time";
import { SchedulesView } from "@/components/schedules/schedules-view";

export const metadata: Metadata = { title: "Schedules" };

// Always dynamic (the app layout reads cookies), so the published calendars are
// read fresh each request — an admin publishing one shows up without a rebuild.
export default function SchedulesPage() {
  return (
    <SchedulesView
      calendars={getPublishedCalendars()}
      todayDay={manilaNow().getDay()}
      nowISO={new Date().toISOString()}
    />
  );
}
