"use client";

// Update arrival strip (#277, states 20, 22 and 24; deck messages A13). A sibling of ArrivalStrip rather than a mode
// of it: a first import's only fact is how much arrived, an update's is what moved, and the two sentences share no
// parameters. Drawn on `ArrivalBandShell`, like every receipt, and lasting the visit it arrived with: the shell holds
// its ✕ for the visit and nothing is stored.

import { deckImportCopy } from "../../lib/copy/deck-import";
import type { UpdateArrivalState } from "../../lib/decks/arrival";
import { ArrivalBandShell, ArrivalDismiss } from "./arrival-strip";

const copy = deckImportCopy.update.arrival;

export function UpdateStrip({ arrival, onDismiss }: { arrival: UpdateArrivalState; onDismiss: () => void }) {
  // State 20: the param said an update happened but carried no figures we wrote,
  // so the strip states the fact at both widths and prints no numbers.
  const counted = arrival === "countless" ? null : arrival;
  const inN = counted ? String(counted.in) : "";
  const outN = counted ? String(counted.out) : "";
  const text = !counted
    ? copy.updatedNoCounts
    : counted.kept > 0
      ? copy.updatedWithKept(inN, outN, String(counted.kept))
      : copy.updated(inN, outN);

  return (
    <ArrivalBandShell>
      <span aria-hidden className="text-[12px] md:text-[14px] leading-none text-[color:var(--success)]">
        ✓
      </span>
      {/* The phone takes the desktop sentence, kept count and all: the board draws one at both widths. */}
      <p className="flex-1 m-0 text-[13.5px] text-[color:var(--fg-body)]">{text}</p>
      <ArrivalDismiss onDismiss={onDismiss} label={copy.dismiss} />
    </ArrivalBandShell>
  );
}
