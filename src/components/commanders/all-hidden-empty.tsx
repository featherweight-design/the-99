"use client";

// "Everything here is hidden" (hide-commander handoff §5, Edges state 11): a list the player emptied by
// hiding every row it would show. The shared zero state, under the rack as the other list states sit, so
// the strip and the count line above it still say where the reader is.

import { planeCopy } from "../../lib/copy/commanders-plane";
import { PrimaryButton } from "../ui/button";
import { ZERO_PRIMARY, ZeroState } from "../ui/zero-state";

const copy = planeCopy.allHidden;

/**
 * `hiddenHref` is the Hidden list, the board's **See hidden**. It is optional because that route does
 * not exist yet: until it does the state draws no button rather than a link that 404s, and the sentence
 * still names both ways out.
 */
export function AllHiddenEmpty({
  lane,
  hidden,
  hiddenHref,
}: {
  lane: "owned" | "discover";
  /** The rows the list would have shown, every one of them hidden. */
  hidden: number;
  hiddenHref?: string;
}) {
  return (
    <ZeroState
      heading={copy.heading}
      body={lane === "owned" ? copy.owned(hidden) : copy.discover(hidden)}
      primary={
        hiddenHref ? (
          <PrimaryButton href={hiddenHref} className={ZERO_PRIMARY}>
            {copy.cta}
          </PrimaryButton>
        ) : undefined
      }
    />
  );
}
