"use client";

import { Fragment, useState, type ReactNode } from "react";

/**
 * Remounts the deck's builder for each new Try it landing (discovery R2, E11). A client navigation to the deck the
 * reader is already on, with `?tool=` (or Back and Forward between two such addresses), brings a new `request` from the
 * page's render. The builder then starts fresh, exactly as it does arriving from another route: its tab and view
 * open, and nothing the reader had open on this deck (a panel, a hub tool, Top off's list, Lock cards) stands between
 * the landing and its target. A render with no `?tool=` (an ordinary refresh, an edit's revalidation) keeps the
 * builder as it is.
 */
export function LandingKeyed({ request, children }: { request: string | null; children: ReactNode }) {
  const [seen, setSeen] = useState(request);
  const [epoch, setEpoch] = useState(0);
  if (request !== null && request !== seen) {
    setSeen(request);
    setEpoch((e) => e + 1);
  }
  return <Fragment key={epoch}>{children}</Fragment>;
}
