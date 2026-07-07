import { currentStrand } from "@/lib/session";
import { getDayMark, getPeriods, getTasks } from "@/lib/queries";
import { periodsForDay, resolveScheduleDay } from "@/lib/domain/schedule";
import { toISODate } from "@/lib/domain/time";
import { TodayView } from "@/components/today/today-view";

export default async function TodayPage() {
  const strand = await currentStrand();
  const now = new Date();

  const { day, isToday, date } = resolveScheduleDay(now);
  const dayPeriods = periodsForDay(getPeriods(strand), day);
  const mark = getDayMark(toISODate(date));
  // The whole (sorted) list — the rail splits it into overdue / horizon /
  // later on the client so a deadline further out is never dropped.
  const tasks = getTasks(strand);

  return (
    <TodayView
      dayPeriods={dayPeriods}
      day={day}
      isToday={isToday}
      dateISO={date.toISOString()}
      mark={mark}
      tasks={tasks}
      nowISO={now.toISOString()}
      showStrand={strand === null}
    />
  );
}
