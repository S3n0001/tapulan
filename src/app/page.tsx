import { currentStrand } from "@/lib/session";
import { getPeriods, getTasks } from "@/lib/queries";
import { periodsForDay, resolveScheduleDay } from "@/lib/domain/schedule";
import { dueSoon } from "@/lib/domain/tasks";
import { TodayView } from "@/components/today/today-view";

export default async function TodayPage() {
  const strand = await currentStrand();
  const now = new Date();

  const { day, isToday, date } = resolveScheduleDay(now);
  const dayPeriods = periodsForDay(getPeriods(strand), day);
  const soon = dueSoon(getTasks(strand), now, 7);

  return (
    <TodayView
      dayPeriods={dayPeriods}
      day={day}
      isToday={isToday}
      dateISO={date.toISOString()}
      soon={soon}
      nowISO={now.toISOString()}
      showStrand={strand === null}
    />
  );
}
