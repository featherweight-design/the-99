"use client";

// Starts product analytics (`lib/analytics/posthog.ts`) and keeps its identity in step with Clerk: identify on
// sign-in with the display name, reset on sign-out. Dormant without a key or off the production hostname.
// Renders nothing.
import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

import { identifyReader, resetReader, startAnalytics } from "../../lib/analytics/posthog";

export function Analytics() {
  const { isLoaded, user } = useUser();
  const userId = user?.id ?? null;
  const name = user?.fullName ?? user?.username ?? null;

  useEffect(() => {
    // Literal `process.env.NEXT_PUBLIC_*` reads: Next inlines them into the bundle at build time.
    void startAnalytics({
      key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      commitSha: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
      hostname: window.location.hostname,
    });
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (userId) identifyReader(userId, name);
    else resetReader();
  }, [isLoaded, userId, name]);

  return null;
}
