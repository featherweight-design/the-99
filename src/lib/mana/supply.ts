// The deck's mana, asked for and made. One pure function, read-only over rows the deck page already
// holds. Deck stats draws card (b) from it, and Mana Balance is its second caller. Nothing here
// weights anything: demand is the raw pip count (Ruling 10, 2026-10-09).
//
// THE INTERFACE FOR A SECOND CALLER. `manaSupply(rows)` takes one row per distinct card; a land row
// carries `produces` (`landProduces`), a non-land row carries `ramp: true` and `produces`
// (`sourceProduces`). It returns `demand` (pips per color), `supply[c].lands` / `.nonland` (copies, a
// source counted once for each color it adds), and `sources[c].lands` / `.nonland`: the card ids behind
// every figure, one entry per copy, so `supply[c].lands === sources[c].lands.length` and a prescriptive
// read can name WHICH cards make a color. A non-land source whose color cannot be read is counted in
// `unattributedNonland` and appears in no `sources` list.

import { isLandFace } from "../cards/facet";
import { frontFaceOracle } from "../recs/faces";
import { activatedFinds, BASIC_TYPES, CONDITIONAL_GRANT, fetchFinds, PICKED_COLOR, sacrificesItself, searchFinds, type Finds, type LandText } from "../swaps/land";
import type { RampKind } from "../labels/types";
import { manaNeeds } from "../profile/build";

export const MANA_COLORS = ["W", "U", "B", "R", "G", "C"] as const;
export type ManaColor = (typeof MANA_COLORS)[number];

const COLORED = ["W", "U", "B", "R", "G"] as const;
const BASIC_TYPE: Record<string, ManaColor> = { plains: "W", island: "U", swamp: "B", mountain: "R", forest: "G" };

/** What the page ships per land: the colors it can add. A land absent from the record is one the
 *  page had no text for (added after load); the browser then reads its type line alone. */
export type LandManaByCard = Readonly<Record<string, readonly ManaColor[]>>;

/** One row per distinct card in the frame being counted (the 99 and the commanders alike). */
export type ManaSupplyCardRow = {
  /** What `sources` lists this card as. */
  id: string;
  typeLine: string;
  manaCost: string | null;
  /** Copies. Every figure below is in copies. */
  quantity: number;
  /** The colors the card can add: `landProduces` for a land, `sourceProduces` for a non-land source. */
  produces?: readonly ManaColor[];
  /** For a NON-LAND row: it is a mana source (a label's `tapsForMana`, `fetchesLand` or
   *  `makesTreasure`, or the classifier's ramp where there is no fresh label). The caller flags the 99
   *  only: a commander that taps for mana is not counted here. */
  ramp?: boolean;
};

export type ManaSupply = {
  /** Raw pips per color, copies counted. A HYBRID pip asks for either half, so it counts once for
   *  each half; `{C}` counts under C; generic, Phyrexian and `{2/W}` pips ask for nothing. */
  demand: Record<ManaColor, number>;
  /** Sources per color: a source counts once for each color it can add, so a dual counts twice. */
  supply: Record<ManaColor, { lands: number; nonland: number }>;
  /** The card ids behind `supply`, one per copy. */
  sources: Record<ManaColor, { lands: string[]; nonland: string[] }>;
  /** Copies of non-land sources whose color was read, however many colors each makes. */
  nonlandSources: number;
  /** Copies of non-land mana sources whose color could not be read: counted nowhere on the card. */
  unattributedNonland: number;
  /** Copies of land cards, however many colors each makes. */
  lands: number;
};

const zeros = (): Record<ManaColor, number> => ({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 });

/** One face's abilities into `out`. Reminder text restates the basic types and describes
 *  landcycling; neither is an ability. */
function readFace(card: LandText, deck: readonly ManaColor[], out: Set<ManaColor>): void {
  const text = (card.oracleText ?? "").replace(/\([^)]*\)/g, "");
  for (const ability of text.split("\n")) {
    if (sacrificesItself(ability, card.name)) continue;
    if (PICKED_COLOR.test(ability) && !CONDITIONAL_GRANT.test(ability)) deck.forEach((c) => out.add(c));
    for (const [, effect] of ability.matchAll(/\badd\b([^.]*)\./gi)) {
      for (const [, sym] of effect.matchAll(/\{([WUBRGC])\}/gi)) out.add(sym.toUpperCase() as ManaColor);
      // A grant that reads another permanent (Exotic Orchard, Reflecting Pool) makes nothing on its
      // own. "The chosen color" (Thriving lands) is a free pick among the deck's colors.
      if (CONDITIONAL_GRANT.test(effect)) continue;
      if (/\bany (one )?(color|type)\b|\bany combination of colors\b|\bchosen colou?r\b/i.test(effect)) deck.forEach((c) => out.add(c));
    }
  }
  const finds = fetchFinds(card) ?? activatedFinds(card);
  // Every basic type means an unrestricted search: the deck's colors, as for an any-color land.
  if (finds) findsColors(finds, deck, out);
}

/**
 * What a land can ADD, never its color identity (identity counts a white ability on a colorless
 * land). READINESS Q1: a dual is each color it taps for; a fetch is the basic types it can fetch;
 * an any-color land is each of the deck's colors (`deckColors`, the commanders' identity).
 *
 * The source policy is `swaps/land.ts`'s, so the two cannot disagree about a land: a grant that
 * reads another permanent makes nothing, an ability that sacrifices the land itself is one mana
 * and not a source, and an unrestricted `land card` search reaches every basic type.
 *
 * `oracleText` null reads the type line alone, which is exact for a basic and for a typed dual and
 * is the honest floor for a land the page has no text for.
 */
export function landProduces(card: LandText, deckColors: readonly string[]): ManaColor[] {
  const out = new Set<ManaColor>();
  const deck = COLORED.filter((c) => deckColors.some((d) => d.toUpperCase() === c));
  // Every playable LAND face, unioned: a Pathway is played as either side, so the card can be
  // either color. A non-land face (a spell on the other side) never speaks for the land.
  const types = card.typeLine.split(" // ");
  const texts = (card.oracleText ?? "").split("\n//\n");
  const names = card.name.split(" // ");
  types.forEach((typeLine, i) => {
    if (!isLandFace(typeLine)) return;
    for (const word of typeLine.toLowerCase().split(/[^a-z]+/)) {
      const c = BASIC_TYPE[word];
      if (c) out.add(c);
    }
    readFace({ name: names[i] ?? names[0], typeLine, oracleText: texts[i] ?? null }, deck, out);
  });
  return MANA_COLORS.filter((c) => out.has(c));
}

/** The basics a land search can reach: the deck's colors for `a basic land`, else the named types. */
function findsColors(finds: Finds, deck: readonly ManaColor[], out: Set<ManaColor>): void {
  if (finds.types.size === BASIC_TYPES.length) deck.forEach((c) => out.add(c));
  else for (const t of finds.types) out.add(BASIC_TYPE[t]);
}

/**
 * What a NON-LAND mana source can add. The caller has already decided it IS a source, from a label's
 * `rampKind` (labels carry no color, so the color is read here from the card's text, as the mana
 * addendum's rule 1 says):
 * - `tapsForMana` (a rock or a dork): every symbol in an "add" clause and an unconditional any-color
 *   grant, by `readFace`, the land policy;
 * - `fetchesLand`: the basics the search names, or the deck's colors for `a basic land`;
 * - `makesTreasure`: any color, so the deck's colors;
 * - null, a card with no fresh label: the classifier's ramp, which reads both of the first two.
 * An empty result is a source whose color cannot be read.
 */
export function sourceProduces(card: LandText, kind: RampKind | null, deckColors: readonly string[]): ManaColor[] {
  const out = new Set<ManaColor>();
  const deck = COLORED.filter((c) => deckColors.some((d) => d.toUpperCase() === c));
  if (kind === "makesTreasure") deck.forEach((c) => out.add(c));
  if (kind === null || kind === "tapsForMana") readFace(card, deck, out);
  if (kind === null || kind === "fetchesLand") {
    const finds = searchFinds(card);
    if (finds) findsColors(finds, deck, out);
  }
  return MANA_COLORS.filter((c) => out.has(c));
}

export function manaSupply(cards: readonly ManaSupplyCardRow[]): ManaSupply {
  const demand = zeros();
  const sources = Object.fromEntries(MANA_COLORS.map((c) => [c, { lands: [] as string[], nonland: [] as string[] }])) as ManaSupply["sources"];
  let landCopies = 0;
  let unattributedNonland = 0;
  let nonlandSources = 0;
  const credit = (card: ManaSupplyCardRow, side: "lands" | "nonland") => {
    for (const c of new Set(card.produces ?? [])) for (let k = 0; k < card.quantity; k++) sources[c][side].push(card.id);
  };
  for (const card of cards) {
    if (isLandFace(card.typeLine)) {
      landCopies += card.quantity;
      credit(card, "lands");
      continue;
    }
    for (const pip of manaNeeds(card.manaCost)) {
      for (const half of pip) demand[half as ManaColor] += card.quantity;
    }
    demand.C += (card.manaCost?.match(/\{C\}/gi)?.length ?? 0) * card.quantity;
    if (!card.ramp) continue;
    if ((card.produces ?? []).length === 0) unattributedNonland += card.quantity;
    else {
      nonlandSources += card.quantity;
      credit(card, "nonland");
    }
  }
  const supply = Object.fromEntries(
    MANA_COLORS.map((c) => [c, { lands: sources[c].lands.length, nonland: sources[c].nonland.length }]),
  ) as ManaSupply["supply"];
  return { demand, supply, sources, nonlandSources, unattributedNonland, lands: landCopies };
}
