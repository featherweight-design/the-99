// The deck's four figures, computed. Pure — no database import, no server-only
// import — so a client component may hold these as values and every rule below
// is provable in a unit test.
//
// The loaders that feed them live in `./stats-query`; the deck page's figures
// and Home's roll-up both come through these functions so the two surfaces
// cannot disagree about what a figure means.

import { cardFacet } from "../cards/facet";

// ---------------------------------------------------------------------------
// Play record
// ---------------------------------------------------------------------------

export type GameResult = "win" | "loss" | "draw";

export type PlayRecord = {
  wins: number;
  losses: number;
  draws: number;
  /** Games played. Always wins + losses + draws — `deck_games.result` is held
   *  to those three by a CHECK constraint, so there is no fourth bucket for a
   *  game to fall into and no reason for this to be counted separately. */
  played: number;
};

export const EMPTY_RECORD: PlayRecord = { wins: 0, losses: 0, draws: 0, played: 0 };

/**
 * Tallies logged games. Takes the result alone, so both a full `DeckGame` with
 * its axis marks and a two-column aggregate row satisfy it.
 */
export function playRecord(games: readonly { result: GameResult }[]): PlayRecord {
  const record = { wins: 0, losses: 0, draws: 0, played: games.length };
  for (const game of games) {
    if (game.result === "win") record.wins += 1;
    else if (game.result === "loss") record.losses += 1;
    else record.draws += 1;
  }
  return record;
}

/** Home's roll-up. Adding the per-deck records is the same answer as tallying
 *  every game at once, and it is the one a page holding the per-deck figures
 *  already has the parts for. */
export function sumPlayRecords(records: Iterable<PlayRecord>): PlayRecord {
  const total = { ...EMPTY_RECORD };
  for (const r of records) {
    total.wins += r.wins;
    total.losses += r.losses;
    total.draws += r.draws;
    total.played += r.played;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Colour identity spread
// ---------------------------------------------------------------------------

export const WUBRG = ["W", "U", "B", "R", "G"] as const;
export type Colour = (typeof WUBRG)[number];

export type ColourSpread = Record<Colour, number> & {
  /** Cards whose identity is empty. Counted, because a deck is not described by
   *  five figures that silently omit a third of its artifacts. */
  colourless: number;
  /** Copies counted, colourless included. NOT the sum of the six fields above:
   *  a two-colour card adds to two of them (see below), so that sum can exceed
   *  this. Every share a surface draws divides by this. */
  copies: number;
};

export type SpreadCard = { colorIdentity: readonly string[]; quantity: number };

const emptySpread = (): ColourSpread => ({
  W: 0, U: 0, B: 0, R: 0, G: 0, colourless: 0, copies: 0,
});

/**
 * A MULTI-COLOUR CARD COUNTS ONCE PER COLOUR — a Golgari card adds one to B and
 * one to G, not a half to each. Chosen over the fractional split for two
 * reasons, and both surfaces are bound to it.
 *
 * It answers the question a player actually asks of this figure: "how much
 * black is in here", where a card castable only with black mana counts fully as
 * black however many other colours it also needs. And it stays in whole cards,
 * so no figure is ever a rounded number of cards nobody can point at in the
 * box.
 *
 * The cost is that the five colour figures sum to more than the deck — which is
 * why `copies` is carried beside them rather than derived by adding them up,
 * and why a surface drawing shares divides by `copies`.
 *
 * Identity, not mana cost: `cards.color_identity` is what Commander's deck rule
 * is written in, and it is the field the rest of this app filters a legal pool
 * by. Lands are included for the same reason — an off-colour land is still an
 * identity commitment, unlike its absence from the curve below.
 */
export function colourSpread(cards: readonly SpreadCard[]): ColourSpread {
  const spread = emptySpread();
  for (const card of cards) {
    spread.copies += card.quantity;
    const colours = WUBRG.filter((c) => card.colorIdentity.includes(c));
    if (colours.length === 0) {
      spread.colourless += card.quantity;
      continue;
    }
    for (const colour of colours) spread[colour] += card.quantity;
  }
  return spread;
}

/** Home's roll-up, on the same terms as the per-deck figure. */
export function sumColourSpreads(spreads: Iterable<ColourSpread>): ColourSpread {
  const total = emptySpread();
  for (const s of spreads) {
    for (const colour of WUBRG) total[colour] += s[colour];
    total.colourless += s.colourless;
    total.copies += s.copies;
  }
  return total;
}

// ---------------------------------------------------------------------------
// Mana curve
// ---------------------------------------------------------------------------

/** The last bucket is a ceiling, not a cost: everything at 7 or above lands in
 *  it. Seven is where the tail goes flat and one bar per integer stops saying
 *  anything a player can act on. */
export const CURVE_MAX = 7;

export type CurveBucket = {
  /** The mana value this bucket holds. `CURVE_MAX` holds that value and above. */
  cmc: number;
  copies: number;
};

export type CurveCard = { cmc: number; typeLine: string; quantity: number };

export type ManaCurve = {
  /** One entry per bucket, 0 through CURVE_MAX, always all eight and in order.
   *  A gap in the middle of a curve is a real shape and has to draw as an empty
   *  column, which it cannot do if the bucket is missing. */
  buckets: CurveBucket[];
  /** Non-land copies counted. The denominator for any share drawn off a bucket. */
  copies: number;
  /** Total mana value over those copies, divided by them. Null at zero copies —
   *  a deck of nothing but lands has no average, and 0 would read as one. */
  average: number | null;
  /** Lands, excluded from everything above and reported so the exclusion is
   *  visible rather than silently missing from the count. */
  lands: number;
};

/**
 * LANDS ARE EXCLUDED, as they conventionally are: a land is not cast, so its
 * mana value of zero would pile roughly a third of the deck into the 0 column
 * and flatten every other bar against it.
 *
 * Spotted through `cardFacet`, which reads the FRONT FACE of the type line —
 * the only face played from hand, and the reason a `Creature // Land` back does
 * not drop a creature out of the curve. That is the same land test the synergy
 * panel's facet strip uses, so "is this a land" has one answer in this app.
 *
 * `cards.cmc` is a `real` because Un-set cards carry half mana values. They are
 * rounded to the nearest whole bucket rather than given fractional columns of
 * their own: half a mana is a joke card's property, not a shape a curve draws.
 * The average is computed from the unrounded values, so it stays honest.
 */
export function manaCurve(cards: readonly CurveCard[]): ManaCurve {
  const buckets: CurveBucket[] = Array.from({ length: CURVE_MAX + 1 }, (_, cmc) => ({
    cmc,
    copies: 0,
  }));
  let copies = 0;
  let lands = 0;
  let totalCmc = 0;

  for (const card of cards) {
    if (cardFacet(card.typeLine) === "land") {
      lands += card.quantity;
      continue;
    }
    copies += card.quantity;
    totalCmc += card.cmc * card.quantity;
    const bucket = Math.min(Math.max(Math.round(card.cmc), 0), CURVE_MAX);
    buckets[bucket].copies += card.quantity;
  }

  return {
    buckets,
    copies,
    average: copies === 0 ? null : totalCmc / copies,
    lands,
  };
}
