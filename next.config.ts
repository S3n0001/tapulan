import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it out of the bundler.
  serverExternalPackages: ["better-sqlite3"],
  // lets a second dev server run against its own build dir (two sessions
  // sharing .next corrupt each other's webpack cache)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // baseline hardening — no framing (clickjacking), no MIME sniffing, and a
  // conservative referrer policy, plus a CSP and (in production) HSTS.
  //
  // The CSP is shipped Report-Only for now: Next's dev overlay and some of
  // its inline bootstrap scripts need either 'unsafe-inline' or a nonce
  // pipeline to run cleanly, and we haven't wired a nonce through the App
  // Router yet. 'unsafe-inline' for script-src would defeat most of the
  // point of a script CSP, so report-only lets us see what would break
  // (via the browser console/report endpoint) without risking an outage.
  // Flip to the enforcing `Content-Security-Policy` header once verified.
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
    ].join("; ");

    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy-Report-Only", value: csp },
    ];

    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      });
    }

    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
