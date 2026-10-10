// Frank Karsten's published mana requirements, as reference figures. Mana Balance shows them as
// evidence beside the deck's own count and never as a verdict (Hugh, 2026-10-10): scored against his
// play experience on ten decks, no rule built on them matched (plan, "Verdict rules rejected").
//
// SOURCE: Frank Karsten, "How Many Sources Do You Need to Consistently Cast Your Spells? A 2022
// Update", TCGplayer Infinite (first published on ChannelFireball, 2022-02-08). The 99-card column
// assumes 41 lands, the London mulligan with Commander's free first mulligan and free first draw, and
// at least an 89 + M% chance of the sources by turn M for a spell of mana value M. The column below
// was pasted from the article's summary table by Hugh on 2026-10-10.
//
// THE ARTICLE PUBLISHES NO ROW BEYOND THESE 19. For a pattern with more generic mana than the table's
// last row for the same pips (6C, 6CC, 2CCCC), `karstenSources` returns `atMost`: the requirement
// falls as generic mana rises, so the last published row is a ceiling, and it is shown as one. A
// pattern with five or more pips has no row and no ceiling and is `unknown`.

import type { ManaColor } from "./supply";

/** [generic mana, colored pips of the one color, sources required in a 99-card deck]. Karsten's
 *  notation: `1CC` is one generic plus two of the color; `CC` is two of the color and nothing else. */
const ROWS: readonly (readonly [number, number, number])[] = [
  [5, 1, 14], // 5C    Drowner of Hope
  [4, 1, 15], // 4C    Doubling Season
  [3, 1, 16], // 3C    Collected Company
  [2, 1, 18], // 2C    Reckless Stormseeker
  [5, 2, 20], // 5CC   Hullbreaker Horror
  [1, 1, 19], // 1C    Ledger Shredder
  [4, 2, 22], // 4CC   Primeval Titan
  [0, 1, 19], // C     Monastery Swiftspear
  [3, 2, 23], // 3CC   Baneslayer Angel
  [4, 3, 26], // 4CCC  Nyxbloom Ancient
  [2, 2, 26], // 2CC   Wrath of God
  [3, 3, 28], // 3CCC  Massacre Wurm
  [1, 2, 28], // 1CC   Narset, Parter of Veils
  [2, 3, 30], // 2CCC  Garruk, Primal Hunter
  [0, 2, 30], // CC    Lord of Atlantis
  [1, 3, 33], // 1CCC  Cryptic Command
  [1, 4, 36], // 1CCCC Unnatural Growth
  [0, 3, 36], // CCC   Goblin Chainwhirler
  [0, 4, 39], // CCCC  Dawn Elemental
];

export type KarstenSources =
  | { kind: "known"; sources: number }
  /** No published row, but one with the same pips and less generic mana is a ceiling. */
  | { kind: "atMost"; sources: number }
  | { kind: "unknown" };

/** The sources Karsten's 99-card column asks for a spell with `generic` other mana and `pips` of one
 *  color: the published row, a ceiling from the last published row with the same pips, or `unknown`. */
export function karstenSources(generic: number, pips: number): KarstenSources {
  const same = ROWS.filter(([, p]) => p === pips);
  const row = same.find(([g]) => g === generic);
  if (row) return { kind: "known", sources: row[2] };
  const last = same.reduce<readonly [number, number, number] | null>((a, r) => (a === null || r[0] > a[0] ? r : a), null);
  return last !== null && generic > last[0] ? { kind: "atMost", sources: last[2] } : { kind: "unknown" };
}

/** Karsten's notation for a pattern: `3CC`, `CC`, `C`. */
export function patternName(generic: number, pips: number): string {
  return `${generic > 0 ? generic : ""}${"C".repeat(pips)}`;
}

/** Karsten's 99-card land-count regression: lands = 31.42 + 3.13 x average mana value - 0.28 x cheap
 *  ramp and draw. The constants are as quoted in secondary write-ups of his Commander land article and
 *  were not checked against the article itself; with Deckcheck's own inputs for Gishath (average MV
 *  4.34, 6 ramp) they give 43.3, the 43 it reports. Average mana value counts the commander as one
 *  more card. `cheapRampDraw` here is mana sources of mana value 3 or less: draw spells are not
 *  counted, which overstates the figure for a deck that draws. */
export function karstenLands(averageManaValue: number, cheapRampDraw: number): number {
  return 31.42 + 3.13 * averageManaValue - 0.28 * cheapRampDraw;
}
