// Global Degraded Banner (§Global Degraded Banner).
// Amber left-border banner shown when degraded===true.
// Desktop: flex row with icon ring, text block, Retry button.
// Mobile: flex row (no ring), warning icon inline, text column, no separate button slot.
// Retry action: <form action={retryRecs}> secondary button.

import { retryRecs } from "../../app/commanders/actions";
import { availabilityCopy } from "../../lib/copy/availability";
import { RetryGhost, RetryLink } from "./retry-submit";

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
  // Every per-variant choice below keys off `variant` and never off whether
  // some other string came back non-empty. Copy is data: an editor emptying one
  // key should blank that line, not silently switch a button's label.
  const synergy = variant === "synergy";
  // The heading is the deck-read failure in both new variants, because that is
  // the one the player can see a control change for: `What's free` goes struck
  // and unselectable, while EDHREC being unreachable changes no affordance.
  const heading = synergy ? "Synergy data unavailable" : degraded.heading;
  const mobileBody = synergy
    ? "EDHREC is unreachable, so scores count only your cards and the roles they fill."
    : variant === "both"
      ? degraded.bodyWithSynergy
      : degraded.body;
  const desktopBody = synergy
    ? "EDHREC is unreachable, so fit scores count only your cards and the roles they fill. Synergy details come back when it does."
    : variant === "both"
      ? degraded.bodyWithSynergy
      : degraded.body;
  // Both retry labels are SHIPPED strings on the synergy variant, and mobile's
  // `Retry` differs from the copy block's `Retry now`. Both stay literal there
  // even where the block happens to agree, so a later copy edit cannot move a
  // pixel this ticket did not touch.
  const mobileRetry = synergy ? "Retry" : degraded.retry;
  const desktopRetry = synergy ? "Retry now" : degraded.retry;

  return (
    <>
      {/* ── Mobile ── */}
      <div
        className="sm:hidden flex gap-[10px] rounded-[10px] p-[11px_13px]"
        style={{
          background: "var(--elevated-hover)",
          border: "1px solid var(--border-strong)",
          borderLeft: "3px solid var(--warning)",
        }}
      >
        {/* Warning icon inline */}
        <span
          aria-hidden="true"
          style={{ color: "var(--warning)", fontSize: 14, lineHeight: 1.3, flexShrink: 0 }}
        >
          ⚠
        </span>

        <div className="flex-1 min-w-0">
          <p className="m-0" style={{ fontSize: 12.5, color: "var(--fg)", fontWeight: 500 }}>
            {heading}
          </p>
          <div
            className="m-0"
            style={{ fontSize: 11.5, color: "var(--fg-muted)", lineHeight: 1.5, marginTop: 2 }}
          >
            {mobileBody}{" "}
            <form action={retryRecs} className="inline">
              <RetryLink fontSize={11.5}>{mobileRetry}</RetryLink>
            </form>
          </div>
        </div>
      </div>

      {/* ── Desktop ── */}
      <div
        className="hidden sm:flex items-center gap-[16px] rounded-[12px] p-[16px_20px]"
        style={{
          margin: "20px 34px 0",
          background: "var(--elevated-hover)",
          border: "1px solid var(--border-strong)",
          borderLeft: "3px solid var(--warning)",
        }}
      >
        {/* Warning icon ring */}
        <div
          className="flex-none flex items-center justify-center rounded-full"
          style={{
            width: 40,
            height: 40,
            background: "color-mix(in oklab, var(--warning) 13%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--bg))",
            color: "var(--warning)",
            fontSize: 18,
          }}
          aria-hidden="true"
        >
          ⚠
        </div>

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <p className="m-0" style={{ fontSize: 15, color: "var(--fg)", fontWeight: 600 }}>
            {heading}
          </p>
          <p
            className="m-0"
            style={{ fontSize: 13, color: "var(--fg-body)", lineHeight: 1.55, marginTop: 3 }}
          >
            {desktopBody}
          </p>
        </div>

        {/* Retry button */}
        <form action={retryRecs}>
          {/* brand focus-visible outline treatment inherited from globals.css */}
          <RetryGhost className="flex-none text-[13px] p-[10px_18px]">{desktopRetry}</RetryGhost>
        </form>
      </div>
    </>
  );
}
