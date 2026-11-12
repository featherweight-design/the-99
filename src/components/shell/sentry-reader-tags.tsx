"use client";

// The reader's `user` and `tier` tags for the browser's Sentry events (FWD Sentry plan item 2). The shell computes them on
// the server, the user tag as a keyed hash (`user-tag.ts`), so the key never reaches the browser and the Clerk id never leaves.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export function SentryReaderTags({ user, tier }: { user: string | null; tier: string }) {
  useEffect(() => {
    Sentry.setTag("tier", tier);
    Sentry.setTag("user", user ?? undefined);
  }, [user, tier]);
  return null;
}
