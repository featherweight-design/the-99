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

const copy = deckImportCopy.update.arrival;

export function UpdateStrip({ arrival }: { arrival: UpdateArrivalState }) {
  const [dismissed, setDismissed] = useState(false);
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
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={copy.dismiss}
        className="font-mono text-[10px] md:text-[11px] flex-none cursor-pointer bg-transparent border-0 p-0 text-[color:var(--fg-faint)] md:hover:text-[color:var(--accent)] transition-colors"
      >
        <span className="md:hidden">✕</span>
        <span className="hidden md:inline">{copy.dismiss} ✕</span>
      </button>
    </div>
  );
}
