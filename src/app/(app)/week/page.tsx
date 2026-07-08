import type { Metadata } from "next";
import { currentStrand } from "@/lib/session";
import { getDayMarkMap, getPeriods, getTasks } from "@/lib/queries";
import { isActionable } from "@/lib/domain/tasks";
import { DAY_SHORT, addDays, manilaNow, schoolWeekMonday, toISODate } from "@/lib/domain/time";
import { WeekView, type WeekDay } from "@/components/week/week-view";

export const metadata: Metadata = { title: "Week" };

/** Keep week paging within a sane range (~half a year each way). */
const clampOffset = (n: number) => Math.max(-26, Math.min(52, n));

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ w?: string }>;
}) {
  const strand = await currentStrand();
  const { w } = await searchParams;
  const offset = clampOffset(Number.parseInt(w ?? "0", 10) || 0);

  // Anchor "today" (and the week it lands in) to Manila, not the server clock,
  // so a UTC host doesn't mark yesterday as today during Manila's small hours.
  const now = manilaNow();
  const monday = addDays(schoolWeekMonday(now), offset * 7);
  const todayISO = toISODate(now);
  const marks = getDayMarkMap(toISODate(monday), toISODate(addDays(monday, 4)));

  // still-open requirements: the header chips count them per day, and the view
  // pins each one onto the class block it belongs to (its subject × due date)
  const openTasks = getTasks(strand).filter(isActionable);
  const dueByDay = new Map<string, number>();
  for (const t of openTasks) {
    dueByDay.set(t.dueDate, (dueByDay.get(t.dueDate) ?? 0) + 1);
  }

  const days: WeekDay[] = [0, 1, 2, 3, 4].map((offsetDay) => {
    const date = addDays(monday, offsetDay);
    const iso = toISODate(date);
    return {
      day: offsetDay + 1,
      iso,
      label: DAY_SHORT[offsetDay + 1].toUpperCase(),
      dateNum: date.getDate(),
      isToday: iso === todayISO,
      mark: marks.get(iso) ?? null,
      dueCount: dueByDay.get(iso) ?? 0,
      // a past weekday with open work — the count reads as overdue
      overdue: iso < todayISO,
    };
  });

  return (
    <WeekView
      periods={getPeriods(strand)}
      days={days}
      tasks={openTasks}
      weekOffset={offset}
      nowISO={new Date().toISOString()}
      showStrand={strand === null}
    />
  );
}
