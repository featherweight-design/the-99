"use client";

import { useRouter } from "next/navigation";
import { useCallback, useContext } from "react";

import { Report } from "./pending-report";

/**
 * A code-started navigation that reports its press the way a `<Link>` does, so a slow push reaches
 * the 400ms screen. The push runs in the navigation-pending provider, not here: the component that
 * starts one can unmount before the new page commits, and a report it owned would end with it.
 * Outside the provider (signed-out pages, tests) it is a plain push.
 */
export function usePendingPush(): { go: (href: string) => void } {
  const router = useRouter();
  const push = useContext(Report)?.push;
  const go = useCallback((href: string) => (push ? push(href) : router.push(href)), [push, router]);
  return { go };
}
