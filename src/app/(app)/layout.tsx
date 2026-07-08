import { cookies } from "next/headers";

import { isAdmin } from "@/lib/auth";
import {
  getOpenTaskCount,
  getPeriods,
  getSettings,
  getStrands,
  getSubjects,
  getTasks,
  getTeachers,
} from "@/lib/queries";
import { STRAND_COOKIE, parseStrand } from "@/lib/domain/strand";
import { AppProviders } from "@/components/shell/providers";
import { ClassDetailProvider } from "@/components/classes/class-detail";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileTabs, MobileTopBar } from "@/components/shell/mobile-chrome";
import { CommandPalette } from "@/components/shell/command-palette";
import { SettingsModal } from "@/components/settings/settings-modal";

/**
 * The interactive app shell: 220px sidebar + inset content panel on desktop,
 * slim top bar + bottom tabs on mobile, plus the ⌘K palette and the app-wide
 * class-peek panel. Everything here is strand-scoped and admin-aware. The
 * login-free landing (/welcome) sits OUTSIDE this group, so it renders on the
 * shared theme without any of this chrome.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const strand = parseStrand(store.get(STRAND_COOKIE)?.value);
  const sidebarCollapsed = store.get("tapulan.sidebar")?.value === "1";
  const admin = await isAdmin();
  const strands = getStrands();
  const settings = getSettings();
  const openCount = getOpenTaskCount(strand);

  // Strand-scoped snapshot shared by the ⌘K palette and the app-wide class
  // peek panel, fetched once here (the layout is already dynamic on cookies).
  const subjects = getSubjects(strand);
  const periods = getPeriods(strand);
  const tasks = getTasks(strand);
  const teachers = getTeachers();

  // light rows for the ⌘K palette — id + display fields only
  const paletteTasks = tasks
    .filter((t) => t.status !== "done" && t.status !== "cancelled" && !t.doneInClass)
    .map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type.short,
      subject: t.subject.short,
      due: t.dueDate,
    }));
  const paletteSubjects = subjects.map((s) => ({
    id: s.id,
    short: s.short,
    name: s.name,
  }));

  return (
    <AppProviders isAdmin={admin}>
      <ClassDetailProvider
        subjects={subjects}
        periods={periods}
        tasks={tasks}
        teachers={teachers}
        strands={strands}
        nowISO={new Date().toISOString()}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[100] focus:rounded-[var(--r-control)] focus:bg-pop focus:px-3 focus:py-2 focus:text-[13px] focus:font-medium focus:text-ink focus:shadow-[var(--shadow-overlay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--ring)_55%,transparent)]"
        >
          Skip to content
        </a>
        <div className="lg:flex lg:h-dvh">
          <Sidebar
            strands={strands}
            current={strand}
            settings={settings}
            openCount={openCount}
            defaultCollapsed={sidebarCollapsed}
          />
          <div className="flex min-h-dvh min-w-0 flex-1 flex-col lg:min-h-0 lg:p-2 lg:pl-0">
            <MobileTopBar strands={strands} current={strand} />
            <main
              id="main"
              tabIndex={-1}
              className="relative flex flex-1 flex-col focus:outline-none lg:min-h-0"
            >
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
        <SettingsModal strands={strands} current={strand} />
      </ClassDetailProvider>
    </AppProviders>
  );
}
