import "server-only";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";

/** Shared result envelope + guards for all server actions. */

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T = void>(data: T = undefined as T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}

/** Every read happens in a server component, so refresh the whole tree. */
export function refreshAll(): void {
  revalidatePath("/", "layout");
}

/** Wrap an admin-only mutation: verifies the session, maps throws to fail(). */
export async function guarded<T>(
  run: () => T | Promise<T>
): Promise<ActionResult<Awaited<T>>> {
  if (!(await isAdmin())) return fail("Your admin session expired. Sign in again.");
  try {
    const data = await run();
    refreshAll();
    return ok(data);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Something went wrong.");
  }
}
