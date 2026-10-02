"use client";

import { useLinkStatus } from "next/link";
import { createContext, useContext, useId, useLayoutEffect } from "react";

import { pathOf } from "../../lib/shell/pending-routes";

/**
 * The reporting half of navigation pending, kept apart from the provider so a mark
 * (`PendingPip`, `PendingTrack`) imports nothing but this: every button link in the app carries a
 * track, and the provider's screens would otherwise ride into each of their graphs.
 */
export type Reporter = (id: string, href: string, pending: boolean) => void;

/**
 * What the provider hands its marks: where to report, and the page the press is leaving. `push`
 * runs a code-started navigation from the provider itself (`usePendingPush`), which outlives any
 * component that starts one.
 */
export type PendingContext = { report: Reporter; pathname: string; push?: (href: string) => void };

export const Report = createContext<PendingContext | null>(null);

/** Resolve a link's href against the page it is pressed on: a bare query or hash is this page. */
export function targetOf(href: string, pathname: string): string {
  return href.startsWith("?") || href.startsWith("#") ? pathname : pathOf(href);
}

/**
 * Read inside a `<Link>`: reports its pending state to the provider, and returns it for the mark.
 * Outside the provider (signed-out pages, tests) it reports nothing.
 */
export function usePendingReport(href: string): boolean {
  return useReportPending(href, useLinkStatus().pending);
}

/**
 * The same report for a navigation a `<Link>` cannot carry to its end: one whose press unmounts
 * the link (a menu that closes on the way out), so the caller runs it as a transition and reports
 * the transition's `isPending` from a component that stays mounted.
 */
export function useReportPending(href: string, linkPending: boolean): boolean {
  // A link to the page already open (a query or hash change on it) is not a navigation this
  // feature marks: `useLinkStatus` still reads pending while the page re-renders, so the mark
  // takes the same rule the provider does, rather than drawing for a press it will not escalate.
  // The pathname comes from the provider, not `usePathname`, so a mark reads no router of its own.
  const ctx = useContext(Report);
  const pending = linkPending && (!ctx || targetOf(href, ctx.pathname) !== ctx.pathname);
  const report = ctx?.report;
  const id = useId();
  // The provider hears the RAW state: it applies the same-page rule itself for its screens, and
  // still needs a same-page press for the URL mirrors (`lib/url/mirror`), which must not write
  // over that navigation either. A LAYOUT effect: every layout effect in a commit runs before any
  // passive one, so a page's mirror sees the press whatever the tree order. In the phone shell
  // `<main>` renders before the tab bar, so a passive report from a tab ran after the page's
  // mirror in the same commit.
  useLayoutEffect(() => {
    report?.(id, href, linkPending);
  }, [report, id, href, linkPending]);
  useLayoutEffect(() => () => report?.(id, href, false), [report, id, href]);
  return pending;
}
