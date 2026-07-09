import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

import { RootProviders } from "@/components/shell/providers";

// One source of truth for the tagline that shows in the tab, the social card,
// and the Twitter/X summary — kept in sync by construction.
const description =
  "The class schedule and requirements tracker for lazy and responsible students alike.";

// Absolute base for OG/Twitter image URLs. Override per-environment (preview,
// staging) via NEXT_PUBLIC_SITE_URL; falls back to the production domain.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tapulan.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Tapulan", template: "%s · Tapulan" },
  description,
  applicationName: "Tapulan",
  appleWebApp: { capable: true, title: "Tapulan", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  // Browser-tab favicon + home-screen icon, all a square crop of madam's photo
  // (the earlier dog artwork is retired for now but preserved in git history).
  // An explicit `icons` entry is what makes Next emit the <link rel="icon">;
  // the multi-size .ico stays crisp at 16–48px where a lone 512 PNG would be
  // muddily downscaled, and apple-icon covers iOS "Add to Home Screen".
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
  },
  // The card that unfurls when a link is pasted into Discord, Messenger, iMessage,
  // Slack, etc. Image URLs resolve against metadataBase above.
  openGraph: {
    type: "website",
    siteName: "Tapulan",
    title: "Tapulan",
    description,
    url: "/",
    locale: "en_PH",
    images: [
      {
        url: "/thumb.png",
        width: 800,
        height: 450,
        alt: "Tapulan — remembering what you don't.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tapulan",
    description,
    images: ["/thumb.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfd" },
    { media: "(prefers-color-scheme: dark)", color: "#101112" },
  ],
};

/**
 * The single <html>/<body> shell shared by every route. Kept deliberately thin:
 * it owns the fonts, the base surface, and app-wide theming only. The interactive
 * app chrome (sidebar, mobile bars, ⌘K palette) lives in the (app) route group's
 * layout, so the landing route can render on the same theme without it.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-dvh bg-shell font-sans text-ink antialiased">
        <RootProviders>{children}</RootProviders>
      </body>
    </html>
  );
}
