// How many of a deck's lands arrive tapped, read from each land's own text through `entersAs` and
// `drawbacks` (`swaps/land.ts`), the one reader the swap tools use, so the two cannot disagree about
// a land.

import { isLandFace } from "../cards/facet";
import { drawbacks, entersAs, entersTappedSentence, type LandText } from "../swaps/land";

/** A condition in the sentence that says a land enters tapped: `unless` (first or last), a declined
 *  reveal or payment, or an `if you control`. The swap reader knows only the forward `enters tapped
 *  unless` wording and the shock land's; this count must not call the others always tapped. */
const CONDITIONAL_ENTRY = /\bunless\b|\bif you (?:don't|do not|didn't|did not|control|have|haven't)\b|\bif an opponent\b/i;

/** A land named once, with how many copies the deck holds. */
export type TappedLandName = { name: string; copies: number };

export type TappedLands = {
  /** Copies of lands that themselves enter tapped every time. */
  always: number;
  /** Copies that enter tapped unless a condition holds (a check land, a battle land, a shock land). */
  unless: number;
  /** Copies that enter untapped but fetch a land onto the battlefield tapped (Evolving Wilds): the
   *  delay is the fetched land's, and a fetch like Fabled Passage can untap it. */
  fetch: number;
  /** Copies of land cards, however many enter tapped. */
  lands: number;
  /** The lands behind `always`, `unless` and `fetch`, one entry per card (so the copies add to the
   *  count), in deck order. A basic is never tapped, so it is never named. */
  names: { always: TappedLandName[]; unless: TappedLandName[]; fetch: TappedLandName[] };
};

export const NO_TAPPED_LANDS: TappedLands = { always: 0, unless: 0, fetch: 0, lands: 0, names: { always: [], unless: [], fetch: [] } };

export function tappedLands(deckLands: readonly (LandText & { quantity: number })[]): TappedLands {
  const out: TappedLands = { always: 0, unless: 0, fetch: 0, lands: 0, names: { always: [], unless: [], fetch: [] } };
  const tap = (kind: "always" | "unless" | "fetch", land: LandText & { quantity: number }) => {
    out[kind] += land.quantity;
    out.names[kind].push({ name: land.name, copies: land.quantity });
  };
  for (const land of deckLands) {
    if (!isLandFace(land.typeLine)) continue;
    out.lands += land.quantity;
    const own = entersAs(land);
    if (own?.kind === "entersTapped") {
      // The swap reader says "tapped"; the sentence says whether something excuses it.
      tap(CONDITIONAL_ENTRY.test(entersTappedSentence(land) ?? "") ? "unless" : "always", land);
    } else if (own?.kind === "entersTappedUnless") tap("unless", land);
    // With no entry of its own, an `entersTapped` drawback can only be the fetched land's.
    else if (drawbacks(land).some((d) => d.kind === "entersTapped")) tap("fetch", land);
  }
  return out;
}
