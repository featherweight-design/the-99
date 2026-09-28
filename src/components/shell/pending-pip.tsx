"use client";

import { usePendingReport } from "./pending-report";

/**
 * The nav slot's pending mark (navigation-pending handoff, P1): a 4px diamond in `--fg` under the
 * icon. It is a child of the slot's `<Link>` because `useLinkStatus` is only readable inside one,
 * and it carries `data-pending` so the slot takes its pending fill through `:has()`.
 *
 * The 120ms delay is CSS rather than a timer, so a navigation shorter than that paints nothing.
 * `bottom` is 2px in the 38px rail slot and 1px in the 52px tab slot.
 */
export function PendingPip({ href, bottom }: { href: string; bottom: 1 | 2 }) {
  const pending = usePendingReport(href);
  if (!pending) return null;
  return (
    <span
      aria-hidden
      data-pending
      className="anim-pending-in pointer-events-none absolute left-1/2 -translate-x-1/2"
      style={{ bottom }}
    >
      <span className="anim-pending-pip block size-[4px] rotate-45 bg-[color:var(--fg)]" />
    </span>
  );
}
