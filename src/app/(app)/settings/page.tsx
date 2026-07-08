import type { Metadata } from "next";
import { SettingsRoute } from "@/components/settings/settings-route";

export const metadata: Metadata = { title: "Settings" };

/** Settings lives as a modal in the app shell; this route just opens it. */
export default function SettingsPage() {
  return <SettingsRoute />;
}
