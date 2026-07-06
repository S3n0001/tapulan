import type { Metadata } from "next";
import { isAdmin } from "@/lib/auth";
import {
  getCounts,
  getPeriods,
  getSettings,
  getStrands,
  getSubjects,
  getTaskTypes,
  getTasks,
  getTeachers,
} from "@/lib/queries";
import { AdminDashboard, AdminLogin } from "@/components/admin/admin-view";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return <AdminLogin />;
  }

  return (
    <AdminDashboard
      nowISO={new Date().toISOString()}
      tasks={getTasks()}
      subjects={getSubjects()}
      types={getTaskTypes()}
      periods={getPeriods()}
      teachers={getTeachers()}
      strands={getStrands()}
      settings={getSettings()}
      counts={getCounts()}
    />
  );
}
