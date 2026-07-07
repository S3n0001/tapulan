import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it out of the bundler.
  serverExternalPackages: ["better-sqlite3"],
  // lets a second dev server run against its own build dir (two sessions
  // sharing .next corrupt each other's webpack cache)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // baseline hardening — no framing (clickjacking), no MIME sniffing, and a
  // conservative referrer policy. (A full CSP is deferred: Next needs a nonce
  // pipeline for inline styles/scripts, which is its own change.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
