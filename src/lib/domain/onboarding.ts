/**
 * Once a device has been through the landing — either by picking a strand or by
 * skipping straight into the whole-section view — this cookie marks it
 * "onboarded" so the soft first-run gate stops redirecting "/" to the landing.
 *
 * Plain (non-HttpOnly) cookie, mirroring the strand cookie: the middleware reads
 * it on the edge to decide the redirect, no server round-trip and no PII. One
 * source of truth, one year of shelf life.
 */
export const ONBOARDED_COOKIE = "tapulan_onboarded";
export const ONBOARDED_MAXAGE = 365 * 86_400;
