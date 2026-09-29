"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { useReportPending } from "./pending-report";

/**
 * A code-started navigation that reports its press the way a `<Link>` does. The push runs as a
 * transition, and the component calling this, which stays mounted until the new page commits,
 * reports that transition to the provider, so a slow push reaches the 400ms screen exactly as a
 * press on a link does.
 */
export function usePendingPush(): { go: (href: string) => void } {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<string | null>(null);
  useReportPending(target ?? "", pending && target !== null);
  const go = useCallback(
    (href: string) => {
      setTarget(href);
      startTransition(() => router.push(href));
    },
    [router],
  );
  return { go };
}
