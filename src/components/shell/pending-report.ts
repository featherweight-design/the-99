"use client";

import { useLinkStatus } from "next/link";
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, type RefObject } from "react";

import { pathOf } from "../../lib/shell/pending-routes";

/**
 * A boundary a route tree can register so a navigation that stays inside it confines its
 * pending state to this element instead of covering the whole shell `<main>` (collection
 * tabs overlay fix, #1222 follow-up). `contains` is asked about BOTH the page the press
 * leaves and the page it targets — a navigation that starts or ends outside the boundary is
 * an arrival from elsewhere, which keeps the full-`<main>` screen.
 */
export type PendingScope = {
  ref: RefObject<HTMLElement | null>;
  contains: (pathname: string) => boolean;
};

/**
 * The reporting half of navigation pending, kept apart from the provider so a mark
 * (`PendingPip`, `PendingTrack`) imports nothing but this: every button link in the app carries a
 * track, and the provider's screens would otherwise ride into each of their graphs.
 */
export type Reporter = (id: string, href: string, pending: boolean) => void;

/**
 * What the provider hands its marks: where to report, and the page the press is leaving. `push`
 * runs a code-started navigation from the provider itself (`usePendingPush`), which outlives any
 * component that starts one. `registerContentScope` is how a route tree installs or removes a
 * `PendingScope`.
 */
export type PendingContext = {
  report: Reporter;
  pathname: string;
  push?: (href: string) => void;
  registerContentScope: (scope: PendingScope | null) => void;
};

export const Report = createContext<PendingContext | null>(null);

/** Resolve a link's href against the page it is pressed on: a bare query or hash is this page. */
export function targetOf(href: string, pathname: string): string {
  return href.startsWith("?") || href.startsWith("#") ? pathname : pathOf(href);
}

/**
 * Registers an element as the boundary a same-scope navigation confines its pending state to,
 * for as long as the calling component stays mounted. The provider calls `contains` at the
 * moment of each navigation decision rather than reading a cached verdict, so a caller is free
 * to pass a pure function of the pathname — the one case this exists for today — without it
 * ever going stale.
 */
export function usePendingContentScope(contains: (pathname: string) => boolean): RefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);
  const ctx = useContext(Report);
  // A layout effect, so the boundary is in place before the first navigation decision a child
  // press could trigger in the same commit. Registers once per mount: `contains` is meant to be
  // a stable function of the pathname alone, not a closure over this component's own state.
  useLayoutEffect(() => {
    ctx?.registerContentScope({ ref, contains });
    return () => ctx?.registerContentScope(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx]);
  return ref;
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
  useEffect(() => {
    report?.(id, href, pending);
  }, [report, id, href, pending]);
  useEffect(() => () => report?.(id, href, false), [report, id, href]);
  return pending;
}
