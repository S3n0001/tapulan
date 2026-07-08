import type { Metadata } from "next";
import { currentStrand } from "@/lib/session";
import { getPeriods, getStrands, getSubjects, getTasks, getTeachers } from "@/lib/queries";
import { ClassesView } from "@/components/classes/classes-view";

export const metadata: Metadata = { title: "Classes" };

// Always dynamic (the layout reads cookies), so useSearchParams inside
// ClassesView never needs a Suspense boundary here.
export default async function ClassesPage() {
  const strand = await currentStrand();

  return (
    <ClassesView
      subjects={getSubjects(strand)}
      periods={getPeriods(strand)}
      tasks={getTasks(strand)}
      teachers={getTeachers()}
      strands={getStrands()}
      nowISO={new Date().toISOString()}
    />
  );
}
