import type { NextConfig } from "next";

/**
 * NEXT_PUBLIC_BASE_PATH lets the same build serve from a sub-path
 * (e.g. GitHub Pages at /tapulan) or from the root (tapulan.com, Vercel).
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
