"use client";

import { createContext, useContext, type ReactNode } from "react";

/** Whether this device holds a valid admin session (read server-side). */
const AdminContext = createContext(false);

export function AdminProvider({ value, children }: { value: boolean; children: ReactNode }) {
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useIsAdmin(): boolean {
  return useContext(AdminContext);
}
