"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { openSettings } from "./settings-modal";

/**
 * Settings is a modal, not a page ([[settings-modal]]) — but the /settings deep
 * link should still land somewhere sensible. Opening the modal and replacing
 * the URL with the home view means a bookmark (or a typed /settings) opens the
 * panel over Today, and closing it leaves the app where a returning glance
 * expects to be, with no dead full-page settings screen to maintain.
 */
export function SettingsRoute() {
  const router = useRouter();
  useEffect(() => {
    openSettings();
    router.replace("/");
  }, [router]);
  return null;
}
