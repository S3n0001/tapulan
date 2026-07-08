import { currentStrand } from "@/lib/session";
import { getDayMark, getPeriods, getTasks } from "@/lib/queries";
import { periodsForDay, resolveScheduleDay } from "@/lib/domain/schedule";
import { manilaNow, toISODate } from "@/lib/domain/time";
import { TodayView } from "@/components/today/today-view";

export default async function TodayPage() {
  const strand = await currentStrand();

  // Resolve the school day from Manila's wall clock, not the server's — a UTC
  // host is still on "yesterday" through Manila's early morning.
  const { day, isToday, date } = resolveScheduleDay(manilaNow());
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
      dateISO={toISODate(date)}
      mark={mark}
      tasks={tasks}
      nowISO={new Date().toISOString()}
      showStrand={strand === null}
    />
  );
}
