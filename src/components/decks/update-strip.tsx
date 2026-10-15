// Update arrival strip (#277, states 20, 22 and 24). A sibling of ArrivalStrip
// rather than a mode of it: a first import's only fact is how much arrived, an
// update's is what moved, and the two sentences share no parameters.
//
// Dismissible, but the dismissal is never persisted. The import strip persists
// its own per deck, which is right for a thing that happens once; an update
// happens many times, and the same persistence would silence every update after
// the first. Component state resets on the next arrival, so the strip shows.

"use client";

import { useState } from "react";
import { deckImportCopy } from "../../lib/copy/deck-import";
import type { UpdateArrivalState } from "../../lib/decks/arrival";
import { ArrivalDismiss } from "./arrival-strip";

const copy = deckImportCopy.update.arrival;

export function UpdateStrip({ arrival }: { arrival: UpdateArrivalState }) {
  const [dismissed, setDismissed] = useState(false);

  // The App Router can keep this mounted across a navigation, so component state
  // alone would carry a dismissal into the next update — the thing the comment
  // above promises it does not do. Reset when the figures change, which is
  // React's own pattern for deriving state from a prop.
  //
  // Two consecutive updates with identical figures share a token and the second
  // stays dismissed. That is the resolution the `?updated=` param itself has:
  // it carries counts and no nonce, so the two arrivals are not distinguishable
  // from anything on the page.
  const token = arrival === "countless" ? "countless" : `${arrival.in}-${arrival.out}-${arrival.kept}`;
  const [shown, setShown] = useState(token);
  if (shown !== token) {
    setShown(token);
    setDismissed(false);
  }

  if (dismissed) return null;

  // State 20: the param said an update happened but carried no figures we wrote,
  // so the strip states the fact at both widths and prints no numbers.
  const counted = arrival === "countless" ? null : arrival;
  const inN = counted ? String(counted.in) : "";
  const outN = counted ? String(counted.out) : "";
  const desktop = !counted
    ? copy.updatedNoCounts
    : counted.kept > 0
      ? copy.updatedWithKept(inN, outN, String(counted.kept))
      : copy.updated(inN, outN);
  const mobile = counted ? copy.updatedMobile(inN, outN) : copy.updatedNoCounts;

  return (
    <div className="flex items-center gap-[9px] px-[16px] py-[10px] md:gap-[11px] md:px-[30px] md:py-[12px] bg-[color:var(--surface-rail)] [border-bottom:1px_solid_var(--border)]">
      <span aria-hidden className="text-[12px] md:text-[14px] leading-none text-[color:var(--success)]">
        ✓
      </span>
      <p className="flex-1 m-0 text-[color:var(--fg-body)]">
        {/* The kept count is dropped below md for room, which is why the mobile
            string takes only two figures. */}
        <span className="md:hidden font-mono text-[10.5px]">{mobile}</span>
        <span className="hidden md:inline text-[13.5px]">{desktop}</span>
      </p>
      <ArrivalDismiss onDismiss={() => setDismissed(true)} label={copy.dismiss} />
    </div>
  );
}
