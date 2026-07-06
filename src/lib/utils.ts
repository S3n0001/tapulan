import { clsx, type ClassValue } from "clsx";
import type { SchoolClass, Strand, Task } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Classes visible to a strand (core + that strand's majors). */
export function classesForStrand(
  classes: SchoolClass[],
  strand: Strand | null
): SchoolClass[] {
  if (!strand) return classes;
  return classes.filter((c) => c.strands.includes(strand));
}

/** Tasks whose class is visible to the strand. */
export function tasksForStrand(
  tasks: Task[],
  classes: SchoolClass[],
  strand: Strand | null
): Task[] {
  const visible = new Set(classesForStrand(classes, strand).map((c) => c.id));
  return tasks.filter((t) => visible.has(t.classId));
}

export function byDueDate(a: Task, b: Task): number {
  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
}

export function classById(
  classes: SchoolClass[],
  id: string
): SchoolClass | undefined {
  return classes.find((c) => c.id === id);
}

/** 12% tinted background for a hex accent, readable in both themes. */
export function tint(hex: string, alpha = 0.13): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
