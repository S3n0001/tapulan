import type { Metadata } from "next";
import { currentStrand } from "@/lib/session";
import { getPeriods } from "@/lib/queries";
import { DAY_SHORT, addDays, schoolWeekMonday, toISODate } from "@/lib/domain/time";
import { WeekView, type WeekDay } from "@/components/week/week-view";

export const metadata: Metadata = { title: "Week" };

export default async function WeekPage() {
  const strand = await currentStrand();
  const now = new Date();
  const monday = schoolWeekMonday(now);
  const todayISO = toISODate(now);

  const days: WeekDay[] = [0, 1, 2, 3, 4].map((offset) => {
    const date = addDays(monday, offset);
    return {
      day: offset + 1,
      iso: toISODate(date),
      label: DAY_SHORT[offset + 1].toUpperCase(),
      dateNum: date.getDate(),
      isToday: toISODate(date) === todayISO,
    };
  });

  return (
    <WeekView
      periods={getPeriods(strand)}
      days={days}
      nowISO={now.toISOString()}
      showStrand={strand === null}
    />
  );
}
