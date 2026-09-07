"use client";
// Client wrapper: the art header's tap band + the "Card details" chip. Both
// open the shared card modal through CardDetailProvider, which detail.tsx
// already mounts for the role chips further down the page.

import { useCardDetail } from "../cards/card-detail-provider";
import { PENDING_OPACITY } from "./list-nav";

export function FullCardTrigger({ oracleId }: { oracleId: string }) {
  const { open, pendingOracleId } = useCardDetail();
  const pending = pendingOracleId === oracleId;

  return (
    <>
      {/* Full-band tap target — per state table, tapping the art header opens
          the card. Presentational (not a button, never focusable); the labeled
          chip below is the accessible control. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 cursor-pointer"
        onClick={() => open(oracleId)}
      />

      {/* ⛶ affordance chip. The handoff heading is still §"⛶ Full card"
          affordance chip — that is the design doc's own title, kept here so the
          section is still findable, not this control's label. The label reads
          "Card details" rather than "Full card": the modal leads with
          printings and rulings and draws the art at 180px, so the old label
          would be promising a picture this surface no longer opens. */}
      <button
        type="button"
        // brand focus-visible outline treatment inherited from globals.css
        className="absolute inline-flex items-center rounded-full bg-[color-mix(in_oklab,var(--bg)_55%,transparent)] border border-[color:color-mix(in_oklab,var(--fg)_18%,transparent)]"
        style={{
          top: 56,
          right: 16,
          gap: 6,
          backdropFilter: "blur(4px)",
          padding: "6px 11px",
          cursor: "pointer",
          opacity: pending ? PENDING_OPACITY : undefined,
        }}
        aria-label="View card details"
        // Never `disabled` while the fetch runs, for the same reason
        // CardDetailTrigger is not: disabling the focused element blurs it, and
        // the modal's focus-return would have nothing to hand focus back to.
        aria-busy={pending}
        onClick={() => open(oracleId)}
      >
        <span style={{ color: "var(--fg)", fontSize: 12 }}>⛶</span>
        <span
          className="font-mono"
          style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--fg)" }}
        >
          Card details
        </span>
      </button>
    </>
  );
}
