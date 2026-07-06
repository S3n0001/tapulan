import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

import { isAdmin } from "@/lib/auth";
import {
  getOpenTaskCount,
  getSettings,
  getStrands,
  getSubjects,
  getTasks,
} from "@/lib/queries";
import { STRAND_COOKIE, parseStrand } from "@/lib/domain/strand";
import { Providers } from "@/components/shell/providers";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileTabs, MobileTopBar } from "@/components/shell/mobile-chrome";
import { CommandPalette } from "@/components/shell/command-palette";

export const metadata: Metadata = {
  title: { default: "Tapulan", template: "%s · Tapulan" },
  description:
    "The class schedule and requirements tracker for our section — unit tests, quizzes, PETAs and more, always current.",
  applicationName: "Tapulan",
  appleWebApp: { capable: true, title: "Tapulan", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0d" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const strand = parseStrand(store.get(STRAND_COOKIE)?.value);
  const admin = await isAdmin();
  const strands = getStrands();
  const settings = getSettings();
  const openCount = getOpenTaskCount(strand);

  // light rows for the ⌘K palette — id + display fields only
  const paletteTasks = getTasks(strand)
    .filter((t) => t.status !== "done" && t.status !== "cancelled")
    .map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type.short,
      subject: t.subject.short,
      due: t.dueDate,
    }));
  const paletteSubjects = getSubjects(strand).map((s) => ({
    id: s.id,
    short: s.short,
    name: s.name,
  }));

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-dvh bg-shell font-sans text-ink antialiased">
        <Providers isAdmin={admin}>
          <div className="lg:flex lg:h-dvh">
            <Sidebar
              strands={strands}
              current={strand}
              settings={settings}
              openCount={openCount}
            />
            <div className="min-w-0 flex-1 lg:flex lg:min-h-0 lg:flex-col lg:p-2 lg:pl-0">
              <MobileTopBar strands={strands} current={strand} />
              <main className="relative bg-bg pb-[calc(52px+env(safe-area-inset-bottom))] lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:rounded-[var(--r-panel)] lg:border lg:border-line lg:pb-0">
                {children}
              </main>
            </div>
          </div>
          <MobileTabs openCount={openCount} />
          <CommandPalette
            strands={strands}
            current={strand}
            tasks={paletteTasks}
            subjects={paletteSubjects}
          />
        </Providers>
      </body>
    </html>
  );
}
