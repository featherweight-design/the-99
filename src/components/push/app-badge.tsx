"use client";

// The app icon's badge (plan `2026-10-22-push.md`, PR 5; handoff G6, call 7): an installed app carries the Home slot's
// count, as the bar shows it, on its icon. Mounted by the shell only with the reader's PUSH_ENABLED on. Where the
// Badging API is missing, or the page is not an installed app and the call is refused, nothing happens and nothing throws.

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { appBadge } from "../../lib/push/landing";
import { useSeenBadges, type NavBadges } from "../shell/nav";

type BadgingNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function AppBadge({ badges }: { badges: NavBadges | undefined }) {
  const pathname = usePathname() ?? "";
  // The bar's own rule (Home's count drops on Home and after), so the icon never disagrees with the slot.
  const count = useSeenBadges(badges, pathname)?.home;
  const figure = appBadge(count);
  const key = figure === "clear" ? 0 : figure.set;
  useEffect(() => {
    const nav = navigator as BadgingNavigator;
    try {
      const done = key > 0 ? nav.setAppBadge?.(key) : nav.clearAppBadge?.();
      // A page that is not an installed app may refuse; the badge is an extra.
      void done?.catch?.(() => {});
    } catch {
      // not a fallback: the icon keeps its last figure, and the next render of the bar sets it again.
    }
  }, [key]);
  return null;
}
