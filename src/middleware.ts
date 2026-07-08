import { NextResponse, type NextRequest } from "next/server";
import { STRAND_COOKIE, parseStrand } from "@/lib/domain/strand";
import { ONBOARDED_COOKIE } from "@/lib/domain/onboarding";

/**
 * Soft first-run gate. A device that has never been onboarded (no onboarded
 * cookie AND no strand chosen) is sent to the landing the first time it opens
 * the app home. Once onboarded — or once a strand has been picked, which implies
 * the app is already in use — "/" opens straight to Today, so a returning 6:50 AM
 * glance never has to pass through the landing again.
 *
 * Only the bare home ("/") is gated: deep links (a shared /tasks?task=… link, a
 * bookmarked /week) are always honored, matching the app's "truth over tidiness"
 * stance. Both cookies are read on the edge; this never touches the database.
 */
export function middleware(req: NextRequest) {
  const onboarded = req.cookies.get(ONBOARDED_COOKIE)?.value === "1";
  const hasStrand = parseStrand(req.cookies.get(STRAND_COOKIE)?.value) !== null;

  if (!onboarded && !hasStrand) {
    const url = req.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Only the app home; the landing, deep links, API routes and assets are untouched.
  matcher: ["/"],
};
