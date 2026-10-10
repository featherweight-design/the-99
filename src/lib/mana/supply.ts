// The deck's mana, asked for and made. One pure function, read-only over rows the deck page already
// holds. Deck stats PR 4 draws card (b) from it; PR 4b extends THIS function (never a second one) to
// attribute non-land sources by color, and Mana Balance is its second caller. Nothing here weights
// anything: demand is the raw pip count (Ruling 10, 2026-10-09).
//
// PR 4 scope, exactly: `supply[c].lands` is real land counting (READINESS Q1); `supply[c].nonland`
// stays 0 for every color; a non-land mana source is counted once in `unattributedNonland` and
// carries no color.

import { isLandFace } from "../cards/facet";
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
  typeLine: string;
  manaCost: string | null;
  /** Copies. Every figure below is in copies. */
  quantity: number;
  /** For a LAND row: the colors it can add (`landProduces`), or its sources count as none. */
  produces?: readonly ManaColor[];
  /** For a NON-LAND row: it is a mana source (`classifyRoles` ramp, READINESS Q1). Counted, never
   *  colored (PR 4). That is the role classifier's definition, deliberately not the Jobs card's
   *  label-based Ramp row, so the two counts can differ. The caller flags the 99 only: a commander
   *  that taps for mana is not counted here. */
  ramp?: boolean;
};

export type ManaSupply = {
  /** Raw pips per color, copies counted. A HYBRID pip asks for either half, so it counts once for
   *  each half; `{C}` counts under C; generic, Phyrexian and `{2/W}` pips ask for nothing. */
  demand: Record<ManaColor, number>;
  /** Land sources per color: a land counts once for each color it can add, so a dual counts twice.
   *  `nonland` is 0 until PR 4b. */
  supply: Record<ManaColor, { lands: number; nonland: number }>;
  /** Copies of non-land mana sources, counted and not colored (PR 4 only). */
  unattributedNonland: number;
  /** Copies of land cards, however many colors each makes. */
  lands: number;
};

const zeros = (): Record<ManaColor, number> => ({ W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 });

/**
 * What a land can ADD, never its color identity (identity counts a white ability on a colorless
 * land). READINESS Q1: a dual is each color it taps for; a fetch is the basic types it can fetch;
 * an any-color land is each of the deck's colors (`deckColors`, the commanders' identity).
 *
 * `oracleText` null reads the type line alone, which is exact for a basic and for a typed dual and
 * is the honest floor for a land the page has no text for.
 */
export function landProduces(typeLine: string, oracleText: string | null, deckColors: readonly string[]): ManaColor[] {
  const out = new Set<ManaColor>();
  const deck = COLORED.filter((c) => deckColors.some((d) => d.toUpperCase() === c));
  for (const word of typeLine.toLowerCase().split(/[^a-z]+/)) {
    const c = BASIC_TYPE[word];
    if (c) out.add(c);
  }
  // Reminder text restates the basic types and describes landcycling; neither is an ability.
  const text = (oracleText ?? "").replace(/\([^)]*\)/g, "");
  for (const [, effect] of text.matchAll(/\badd\b([^.]*)\./gi)) {
    for (const [, sym] of effect.matchAll(/\{([WUBRGC])\}/gi)) out.add(sym.toUpperCase() as ManaColor);
    if (/\bany (one )?(color|type)\b|\bany combination of colors\b/i.test(effect)) deck.forEach((c) => out.add(c));
  }
  for (const [sentence] of text.matchAll(/search your library for[^.]*\./gi)) {
    const named = [...sentence.toLowerCase().matchAll(/\b(plains|island|swamp|mountain|forest)\b/g)];
    if (named.length > 0) named.forEach(([, t]) => out.add(BASIC_TYPE[t]));
    else if (/\bbasic land\b/i.test(sentence)) deck.forEach((c) => out.add(c));
  }
  return MANA_COLORS.filter((c) => out.has(c));
}

export function manaSupply(cards: readonly ManaSupplyCardRow[]): ManaSupply {
  const demand = zeros();
  const lands = zeros();
  let landCopies = 0;
  let unattributedNonland = 0;
  for (const card of cards) {
    if (isLandFace(card.typeLine)) {
      landCopies += card.quantity;
      for (const c of new Set(card.produces ?? [])) lands[c] += card.quantity;
      continue;
    }
    for (const pip of manaNeeds(card.manaCost)) {
      for (const half of pip) demand[half as ManaColor] += card.quantity;
    }
    demand.C += (card.manaCost?.match(/\{C\}/gi)?.length ?? 0) * card.quantity;
    if (card.ramp) unattributedNonland += card.quantity;
  }
  const supply = Object.fromEntries(MANA_COLORS.map((c) => [c, { lands: lands[c], nonland: 0 }])) as ManaSupply["supply"];
  return { demand, supply, unattributedNonland, lands: landCopies };
}
