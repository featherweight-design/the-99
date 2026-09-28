"use client";

import { usePendingReport } from "./pending-report";

/**
 * A mark-less reporter for an inline text link (navigation-pending plan, PR 2): the link draws no
 * pip and no track, but a slow press still escalates to its route's screen at 400ms. A child of the
 * `<Link>`, because `useLinkStatus` is only readable inside one.
 */
export function PendingReporter({ href }: { href: string }) {
  usePendingReport(href);
  return null;
}
