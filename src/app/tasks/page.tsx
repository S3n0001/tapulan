import type { Metadata } from "next";
import { currentStrand } from "@/lib/session";
import { getSubjects, getTaskTypes, getTasks } from "@/lib/queries";
import { TasksView } from "@/components/tasks/tasks-view";

export const metadata: Metadata = { title: "Tasks" };

// Always dynamic (the layout reads cookies), so useSearchParams inside
// TasksView never needs a Suspense boundary here.
export default async function TasksPage() {
  const strand = await currentStrand();

  return (
    <TasksView
      tasks={getTasks(strand)}
      subjects={getSubjects(strand)}
      types={getTaskTypes()}
      nowISO={new Date().toISOString()}
    />
  );
}
