"use client";

import { usePendingReport } from "./pending-report";

/**
 * The in-page link's pending mark (navigation-pending handoff, P2): a strip along the bottom edge
 * of the link's border box with a 40% `--fg-muted` segment sweeping through it. Indeterminate: it
 * loops and never fills. The host needs `relative overflow-hidden`, and takes its pending fill
 * through `:has([data-pending])`.
 */
export function PendingTrack({ href }: { href: string }) {
  const pending = usePendingReport(href);
  if (!pending) return null;
  return (
    <span
      aria-hidden
      data-pending
      className="anim-pending-in pending-track pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden"
    >
      <span className="anim-pending-sweep block h-full w-[40%] bg-[color:var(--fg-muted)]" />
    </span>
  );
}
