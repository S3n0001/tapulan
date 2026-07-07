import type { Metadata } from "next";
import { currentStrand } from "@/lib/session";
import { getDayMarks, getTasks } from "@/lib/queries";
import { parseMonthKey } from "@/lib/domain/time";
import { CalendarView } from "@/components/calendar/calendar-view";

export const metadata: Metadata = { title: "Calendar" };

// Dynamic (the layout reads cookies). Every task and day mark flows in once;
// the client pages between months instantly, mirroring the month into
// ?m=YYYY-MM so any month stays shareable and reload-safe.
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const strand = await currentStrand();
  const { m } = await searchParams;

  return (
    <CalendarView
      tasks={getTasks(strand)}
      marks={getDayMarks()}
      strand={strand}
      initialMonth={parseMonthKey(m)}
      nowISO={new Date().toISOString()}
    />
  );
}
