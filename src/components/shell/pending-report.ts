"use client";

import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useId } from "react";

import { pathOf } from "../../lib/shell/pending-routes";

/**
 * The reporting half of navigation pending, kept apart from the provider so a mark
 * (`PendingPip`, `PendingTrack`) imports nothing but this: every button link in the app carries a
 * track, and the provider's screens would otherwise ride into each of their graphs.
 */
export type Reporter = (id: string, href: string, pending: boolean) => void;

export const Report = createContext<Reporter | null>(null);

/** Resolve a link's href against the page it is pressed on: a bare query or hash is this page. */
export function targetOf(href: string, pathname: string): string {
  return href.startsWith("?") || href.startsWith("#") ? pathname : pathOf(href);
}

/**
 * Read inside a `<Link>`: reports its pending state to the provider, and returns it for the mark.
 * Outside the provider (signed-out pages, tests) it reports nothing.
 */
export function usePendingReport(href: string): boolean {
  const { pending: linkPending } = useLinkStatus();
  // A link to the page already open (a query or hash change on it) is not a navigation this
  // feature marks: `useLinkStatus` still reads pending while the page re-renders, so the mark
  // takes the same rule the provider does, rather than drawing for a press it will not escalate.
  const pathname = usePathname();
  const pending = linkPending && targetOf(href, pathname) !== pathname;
  const report = useContext(Report);
  const id = useId();
  useEffect(() => {
    report?.(id, href, pending);
  }, [report, id, href, pending]);
  useEffect(() => () => report?.(id, href, false), [report, id, href]);
  return pending;
}
