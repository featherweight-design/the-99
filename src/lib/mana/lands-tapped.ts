// How many of a deck's lands arrive tapped, read from each land's own text through `drawbacks`
// (`swaps/land.ts`), the one reader the swap tools use, so the two cannot disagree about a land.

import { isLandFace } from "../cards/facet";
import { drawbacks, type LandText } from "../swaps/land";

export type TappedLands = {
  /** Copies of lands that enter tapped every time, including a fetch that puts its land in tapped. */
  always: number;
  /** Copies that enter tapped unless a condition holds (a check land, a battle land, a shock land). */
  unless: number;
  /** Copies of land cards, however many enter tapped. */
  lands: number;
};

export function tappedLands(deckLands: readonly (LandText & { quantity: number })[]): TappedLands {
  const out: TappedLands = { always: 0, unless: 0, lands: 0 };
  for (const land of deckLands) {
    if (!isLandFace(land.typeLine)) continue;
    out.lands += land.quantity;
    const kinds = drawbacks(land).map((d) => d.kind);
    if (kinds.includes("entersTapped")) out.always += land.quantity;
    else if (kinds.includes("entersTappedUnless")) out.unless += land.quantity;
  }
  return out;
}
