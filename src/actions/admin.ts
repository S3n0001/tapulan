"use server";

import { randomBytes } from "node:crypto";
import {
  checkAdminPassword,
  checkLoginLockout,
  clearLoginFailures,
  clientIpFromHeaders,
  endAdminSession,
  isAdmin,
  recordLoginFailure,
  setAdminPassword,
  startAdminSession,
} from "@/lib/auth";
import { revokeAllApiTokens } from "@/lib/auth/tokens";
import { setMeta } from "@/lib/db";
import { fail, ok, refreshAll, type ActionResult } from "./_shared";

export async function login(password: string): Promise<ActionResult> {
  const ip = await clientIpFromHeaders();

  const lockedMsg = checkLoginLockout(ip);
  if (lockedMsg) return fail(lockedMsg);

  if (!checkAdminPassword(password)) {
    await recordLoginFailure(ip);
    return fail("Wrong password.");
  }

  clearLoginFailures(ip);
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
  const trimmed = next.trim();
  if (trimmed.length < 8) return fail("New password must be at least 8 characters.");
  if (trimmed.toLowerCase() === "tapulan") return fail("Choose something other than the default password.");
  setAdminPassword(trimmed);

  // Rotating the session secret invalidates every existing 30-day cookie
  // (including this one), and every CLI token is revoked outright since a
  // token carries full admin power — both must be re-established after a
  // password change.
  setMeta("session_secret", randomBytes(32).toString("hex"));
  revokeAllApiTokens();
  await startAdminSession();
  refreshAll();
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
