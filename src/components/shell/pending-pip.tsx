"use client";

import { usePendingReport } from "./pending-report";

/**
 * The nav slot's pending mark (navigation-pending handoff, P1): a 4px diamond in `--fg` under the
 * icon. It is a child of the slot's `<Link>` because `useLinkStatus` is only readable inside one,
 * and it carries `data-pending` so the slot takes its pending fill through `:has()`.
 *
 * The 120ms delay is CSS rather than a timer, so a navigation shorter than that paints nothing.
 * It sits 2px up in the pointer rail's 38px slot and 1px up in the 52px tab slot. The touch rail
 * takes the tab slot's shape, so the rail's placement switches by media query, which is why it is
 * a class and not an inline `bottom` (desktop nav labels audit E4).
 */
const PLACEMENT = {
  rail: "bottom-[2px] touch:bottom-[1px]",
  tab: "bottom-[1px]",
} as const;

export function PendingPip({ href, placement }: { href: string; placement: keyof typeof PLACEMENT }) {
  const pending = usePendingReport(href);
  if (!pending) return null;
  return (
    <span
      aria-hidden
      data-pending
      className={`anim-pending-in pointer-events-none absolute left-1/2 -translate-x-1/2 ${PLACEMENT[placement]}`}
    >
      <span className="anim-pending-pip block size-[4px] rotate-45 bg-[color:var(--fg)]" />
    </span>
  );
}
