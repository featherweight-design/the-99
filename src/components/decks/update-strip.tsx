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
  const desktop = !counted
    ? copy.updatedNoCounts
    : counted.kept > 0
      ? copy.updatedWithKept(inN, outN, String(counted.kept))
      : copy.updated(inN, outN);
  const mobile = counted ? copy.updatedMobile(inN, outN) : copy.updatedNoCounts;

  return (
    <ArrivalBandShell>
      <span aria-hidden className="text-[12px] md:text-[14px] leading-none text-[color:var(--success)]">
        ✓
      </span>
      <p className="flex-1 m-0 text-[color:var(--fg-body)]">
        {/* The kept count is dropped below md for room, which is why the mobile
            string takes only two figures. */}
        <span className="md:hidden font-mono text-[10.5px]">{mobile}</span>
        <span className="hidden md:inline text-[13.5px]">{desktop}</span>
      </p>
      <ArrivalDismiss onDismiss={onDismiss} label={copy.dismiss} />
    </ArrivalBandShell>
  );
}
