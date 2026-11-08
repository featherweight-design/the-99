"use client";

// Starts product analytics (`lib/analytics/posthog.ts`) and keeps its identity in step with Clerk: identify on
// sign-in by Clerk account id alone (never a name or email), reset on sign-out. Dormant without a key or off the production hostname.
// It also records sign-out evidence (`lib/analytics/sign-out-evidence.ts`): a reader this browser saw signed in who
// turns up signed out, on a load or while the page is open. Renders nothing.
import { useEffect, useRef } from "react";
import { useClerk, useUser } from "@clerk/nextjs";

import { captureSignOutEvidence, identifyReader, resetReader, startAnalytics } from "../../lib/analytics/posthog";
import {
  browserFacts, PRESSED_KEY, readTime, SEEN_KEY, signOutEvidence, writeTime, type EvidenceKind,
} from "../../lib/analytics/sign-out-evidence";

export function Analytics() {
  const { isLoaded, user } = useUser();
  const userId = user?.id ?? null;
  const clerk = useClerk();
  // The reader this mount last resolved: undefined until Clerk first loads, so a signed-out first answer is a load.
  const lastUserId = useRef<string | null | undefined>(undefined);

  // Nothing starts until Clerk knows who is reading. Then PostHog starts and, in the same task, takes this
  // reader's identity or drops a previous one, ahead of its first pageview (which the SDK defers by a timer).
  // Starting earlier would credit a browser's first pageview and clicks to whoever it last identified.
  useEffect(() => {
    if (!isLoaded) return;
    // Literal `process.env.NEXT_PUBLIC_*` reads: Next inlines them into the bundle at build time.
    void startAnalytics({
      key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      commitSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
      hostname: window.location.hostname,
    });
    if (userId) {
      writeTime(SEEN_KEY, Date.now());
      writeTime(PRESSED_KEY, null);
      identifyReader(userId);
    } else {
      const was = lastUserId.current;
      const kind: EvidenceKind | null = was === undefined ? "signed_out_load" : was ? "session_ended" : null;
      // Captured before the reset, so the event lands on the person whose session was lost.
      const evidence = kind && signOutEvidence({
        kind,
        seenAt: readTime(SEEN_KEY),
        pressedAt: readTime(PRESSED_KEY),
        now: Date.now(),
        facts: browserFacts(),
        clientSessions: clerk.client?.sessions?.length ?? null,
      });
      if (evidence) {
        captureSignOutEvidence(evidence);
        writeTime(SEEN_KEY, null);
        writeTime(PRESSED_KEY, null);
      }
      resetReader();
    }
    lastUserId.current = userId;
  }, [isLoaded, userId, clerk]);

  // "Last seen signed in" stays current while an installed app sits open for days: refreshed whenever it is shown.
  useEffect(() => {
    if (!userId) return;
    const seen = () => { if (document.visibilityState === "visible") writeTime(SEEN_KEY, Date.now()); };
    document.addEventListener("visibilitychange", seen);
    return () => document.removeEventListener("visibilitychange", seen);
  }, [userId]);

  return null;
}
