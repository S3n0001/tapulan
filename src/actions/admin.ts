"use server";

import {
  checkAdminPassword,
  endAdminSession,
  isAdmin,
  setAdminPassword,
  startAdminSession,
} from "@/lib/auth";
import { setMeta } from "@/lib/db";
import { fail, ok, refreshAll, type ActionResult } from "./_shared";

/** Rudimentary in-process rate limit so the shared password isn't brute-forced. */
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 6;
const LOCK_MS = 60_000;

export async function login(password: string): Promise<ActionResult> {
  const now = Date.now();
  const gate = attempts.get("admin");
  if (gate && gate.until > now && gate.count >= MAX_ATTEMPTS) {
    const secs = Math.ceil((gate.until - now) / 1000);
    return fail(`Too many attempts. Try again in ${secs}s.`);
  }

  if (!checkAdminPassword(password)) {
    const next = gate && gate.until > now ? gate : { count: 0, until: now + LOCK_MS };
    next.count += 1;
    next.until = now + LOCK_MS;
    attempts.set("admin", next);
    return fail("Wrong password.");
  }

  attempts.delete("admin");
  await startAdminSession();
  refreshAll();
  return ok();
}

export async function logout(): Promise<ActionResult> {
  await endAdminSession();
  refreshAll();
  return ok();
}

export async function changePassword(
  current: string,
  next: string
): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Your admin session expired. Sign in again.");
  if (!checkAdminPassword(current)) return fail("Current password is wrong.");
  if (next.trim().length < 4) return fail("New password must be at least 4 characters.");
  setAdminPassword(next.trim());
  return ok();
}

export async function updateSettings(input: {
  sectionName: string;
  schoolYear: string;
}): Promise<ActionResult> {
  if (!(await isAdmin())) return fail("Your admin session expired. Sign in again.");
  const name = input.sectionName.trim();
  const year = input.schoolYear.trim();
  if (!name) return fail("Section name can't be empty.");
  setMeta("section_name", name);
  setMeta("school_year", year);
  refreshAll();
  return ok();
}
