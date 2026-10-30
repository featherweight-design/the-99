"use client";

// Starts product analytics (`lib/analytics/posthog.ts`) and keeps its identity in step with Clerk: identify on
// sign-in by Clerk account id alone (never a name or email), reset on sign-out. Dormant without a key or off the production hostname.
// Renders nothing.
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

import { identifyReader, resetReader, startAnalytics } from "../../lib/analytics/posthog";

export function Analytics() {
  const { isLoaded, user } = useUser();
  const userId = user?.id ?? null;

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
    if (userId) identifyReader(userId);
    else resetReader();
  }, [isLoaded, userId]);

  return null;
}
