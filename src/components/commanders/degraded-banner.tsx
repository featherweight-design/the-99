// Global Degraded Banner (§Global Degraded Banner).
// Amber left-border banner shown when degraded===true.
// Desktop: flex row with icon ring, text block, Retry button.
// Mobile: flex row (no ring), warning icon inline, text column, no separate button slot.
// Retry action: <form action={retryRecs}> secondary button.

import { retryRecs } from "../../app/commanders/actions";
import { availabilityCopy } from "../../lib/copy/availability";
import { GhostButton } from "../ui/button";

/**
 * `synergy` is EDHREC down, `availability` the deck read, `both` the pair.
 *
 * There is never more than one banner. Two failures stack into `both` rather
 * than rendering twice, because to the player they are one "try again" and
 * `retryRecs` already re-runs the whole page.
 */
export type DegradedVariant = "synergy" | "availability" | "both";

/**
 * The synergy variant's four strings stay literal, and deliberately so. The two
 * widths carry DIFFERENT body copy, and the mobile button reads `Retry` where
 * the copy block's `retry` is `Retry now` — so sourcing them from the block
 * would change shipped mobile text as a side effect of adding two variants.
 * Only the new variants read from `availabilityCopy`.
 */
export function DegradedBanner({
  variant = "synergy",
}: {
  variant?: DegradedVariant;
}) {
  const { degraded } = availabilityCopy;
  // The heading is the deck-read failure in both new variants, because that is
  // the one the player can see a control change for: `What's free` goes struck
  // and unselectable, while EDHREC being unreachable changes no affordance.
  const heading = variant === "synergy" ? "Synergy data unavailable" : degraded.heading;
  const body =
    variant === "both"
      ? degraded.bodyWithSynergy
      : variant === "availability"
        ? degraded.body
        : null;

  return (
    <>
      {/* ── Mobile ── */}
      <div
        className="sm:hidden flex gap-[10px] rounded-[10px] p-[11px_13px]"
        style={{
          background: "#211C15",
          border: "1px solid #3A3229",
          borderLeft: "3px solid #E0913C",
        }}
      >
        {/* Warning icon inline */}
        <span
          aria-hidden="true"
          style={{ color: "#E0913C", fontSize: 14, lineHeight: 1.3, flexShrink: 0 }}
        >
          ⚠
        </span>

        <div className="flex-1 min-w-0">
          <p className="m-0" style={{ fontSize: 12.5, color: "#EDE6D8", fontWeight: 500 }}>
            {heading}
          </p>
          <div
            className="m-0"
            style={{ fontSize: 11.5, color: "#A89B84", lineHeight: 1.5, marginTop: 2 }}
          >
            {body ??
              "EDHREC is unreachable. Scores shown are based on pool and role coverage only."}{" "}
            <form action={retryRecs} className="inline">
              <button
                type="submit"
                // brand focus-visible outline treatment inherited from globals.css
                className="underline cursor-pointer bg-transparent border-0 p-0 font-[inherit]"
                style={{ color: "#C9A24B", fontSize: 11.5 }}
              >
                {body ? degraded.retry : "Retry"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Desktop ── */}
      <div
        className="hidden sm:flex items-center gap-[16px] rounded-[12px] p-[16px_20px]"
        style={{
          margin: "20px 34px 0",
          background: "#211C15",
          border: "1px solid #3A3229",
          borderLeft: "3px solid #E0913C",
        }}
      >
        {/* Warning icon ring */}
        <div
          className="flex-none flex items-center justify-center rounded-full"
          style={{
            width: 40,
            height: 40,
            background: "rgba(224,145,60,0.13)",
            border: "1px solid #4A3A24",
            color: "#E0913C",
            fontSize: 18,
          }}
          aria-hidden="true"
        >
          ⚠
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p className="m-0" style={{ fontSize: 15, color: "#EDE6D8", fontWeight: 600 }}>
            {heading}
          </p>
          <p
            className="m-0"
            style={{ fontSize: 13, color: "#C6B79A", lineHeight: 1.55, marginTop: 3 }}
          >
            {body ??
              "EDHREC is unreachable. Fit scores reflect pool and role coverage only — synergy receipts are hidden until the connection is restored."}
          </p>
        </div>

        {/* Retry button */}
        <form action={retryRecs}>
          <GhostButton
            type="submit"
            // brand focus-visible outline treatment inherited from globals.css
            className="flex-none text-[13px] p-[10px_18px]"
          >
            Retry now
          </GhostButton>
        </form>
      </div>
    </>
  );
}
