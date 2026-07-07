import type { MetadataRoute } from "next";

/**
 * PWA manifest — makes Tapulan installable on a phone home screen (Chrome/
 * Android fire "Add to Home Screen" once this + icons exist). Next auto-links
 * it at /manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tapulan",
    short_name: "Tapulan",
    description:
      "Your section's schedule and requirements — what's now, what's next, and what's due.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#101112",
    theme_color: "#101112",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
