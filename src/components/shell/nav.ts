import {
  BookOpen,
  CalendarDays,
  CalendarRange,
  Clock3,
  ListTodo,
  type LucideIcon,
} from "lucide-react";

export interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  /** bare number key that jumps here when no field is focused */
  shortcut: string;
}

export const NAV: NavEntry[] = [
  { href: "/", label: "Today", icon: Clock3, shortcut: "1" },
  { href: "/week", label: "Week", icon: CalendarDays, shortcut: "2" },
  { href: "/calendar", label: "Calendar", icon: CalendarRange, shortcut: "3" },
  { href: "/tasks", label: "Tasks", icon: ListTodo, shortcut: "4" },
  { href: "/classes", label: "Classes", icon: BookOpen, shortcut: "5" },
];

export function isNavActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function viewTitle(pathname: string): string {
  if (pathname.startsWith("/admin")) return "Admin";
  return NAV.find((n) => isNavActive(n.href, pathname))?.label ?? "Tapulan";
}
