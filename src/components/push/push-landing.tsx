"use client";

// A push's landing on Home (plan `2026-10-22-push.md`, PR 5; handoff G5), mounted only with the reader's PUSH_ENABLED
// on and the visit marks the feed seen (decided on the server). It opens the card a price drop or combo push names
// (`push-card`, `push-combo`, written by `public/sw.js`) through the feed's own opener (`useCardDetailIfAny().open`, the
// call `FeedPress` makes), strips both from the address through `mirrorUrl`, and closes every delivered notification,
// since a Home visit marks every unseen item seen (D4). It marks nothing itself. The decisions are pure
// (`lib/push/landing.ts`); every browser call is guarded, so a browser without a service worker or `getNotifications`
// does nothing and throws nothing. Apart from `app-badge.tsx` so the shell never loads the card-detail provider.

import { useEffect } from "react";
import { readPushLanding, strippedLanding } from "../../lib/push/landing";
import { mirrorUrl } from "../../lib/url/mirror";
import { useCardDetailIfAny } from "../cards/card-detail-provider";

/** Close every notification this origin's worker has delivered. Never throws, never waits on the page. */
export async function closeDeliveredNotifications(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (!registration || typeof registration.getNotifications !== "function") return;
    const shown = await registration.getNotifications();
    for (const notification of shown) notification.close();
  } catch {
    // not a fallback: a notification left on the device is stale, never wrong, and the next Home visit tries again.
  }
}

export function PushLanding() {
  const detail = useCardDetailIfAny();
  useEffect(() => {
    // Read once, from the live address: a tap is a real navigation (`WindowClient.navigate` or a new window), so this
    // mount is the landing's. Stripped first, so a remount (Strict Mode, a kept tree) finds nothing to open twice.
    const landing = readPushLanding(window.location.search);
    const stripped = strippedLanding(window.location.href);
    if (stripped) mirrorUrl(stripped, window.history.state);
    if (landing && detail) detail.open(landing.card, undefined, undefined, landing.combo ? { combo: true } : undefined);
    void closeDeliveredNotifications();
    // Mount only: the provider's value changes as a card opens, and the landing is spent by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
