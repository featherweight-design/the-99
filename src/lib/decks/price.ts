// src/lib/decks/price.ts — the pure half of price on the buy tag (#288).
//
// No database import. Client components import these as values, so nothing
// here may reach for `db`, `next/headers` or anything server-only.
//
// LIVENESS IS THE TABLE'S OWN RULE, NOT A CLOCK, and it rests on two
// documented properties. The ingest upserts and never deletes, so a printing
// that sells out keeps its last row with a frozen timestamp, and a reader
// needing "stocked now" compares that timestamp to the newest in the table
// (src/db/schema.ts:81-88). And a run is one transaction, so every row it
// writes shares an `as_of` — a half-finished run would split the table across
// two timestamps and make every surviving row read as sold out
// (src/lib/manapool/seed-prices.ts:74-79).
//
// THE FAILURE MODE INVERTS, AND THAT IS THE POINT. Under a wall-clock window a
// missed ingest run would age every row past the window and eight cards would
// claim to be sold out at once. Under `as_of === newest` a missed run leaves
// every row equal to the maximum, so every row is live and NO card says sold
// out. Staleness stops being something each card asserts badly and becomes one
// fact about the table, disclosed once on the strip.

import { priceCopy } from "../copy/price";

export type PriceFact = {
  cents: number | null;
  foilCents: number | null;
  etchedCents: number | null;
  asOf: Date;
};

export type PriceState = "priced" | "foilOnly" | "soldOut" | "absent";

/**
 * Ten days, not seven. The ingest runs 09:00 UTC every Monday, so a healthy
 * table is routinely six days and twenty-three hours old by the following
 * Monday morning — a seven-day threshold would announce "these are behind"
 * every week on a feed that had done exactly what it was scheduled to do, and
 * a warning that fires on the healthy case teaches the player to ignore it.
 * Ten is one missed run plus slack.
 *
 * One constant governs TWO effects, deliberately: past it the provenance line
 * switches from a weekday to a date, AND it gains the behind clause. A player
 * never reads an ambiguous weekday on a table we already know is behind.
 */
export const PRICE_STALE_AFTER_DAYS = 10;

const DAY_MS = 86_400_000;

/**
 * `as_of` is a `timestamp` WITHOUT time zone holding the feed's `meta.as_of`,
 * which is a UTC instant. Drivers hand that back either already parsed or as
 * `YYYY-MM-DD HH:MM:SS[.ffffff]` — a string `new Date` reads in the RUNTIME's
 * zone, so the same row would date to a different day in Denver than in CI.
 * Only the string form needs the marker; a Date the driver already built is
 * passed through untouched.
 */
export function toUtcInstant(value: string): string {
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(value)) return value;
  return `${value.replace(" ", "T")}Z`;
}

/**
 * `new Date` answers an unparseable value with an Invalid Date rather than an
 * error. That failure is silent and it inverts: `NaN !== NaN` makes every card
 * fail the liveness comparison, so a whole deck would read `sold out` on a
 * timestamp we simply could not read. Throwing hands the caller's `.catch` a
 * clean absence instead.
 */
export function parseAsOf(value: string | Date): Date {
  const parsed = value instanceof Date ? value : new Date(toUtcInstant(value));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`printing_prices.as_of is not a readable timestamp: ${value}`);
  }
  return parsed;
}

/**
 * `absent` is the DEFAULT BRANCH, not a condition — reached by a missing fact
 * and by a live row whose three price columns are all null. A future price
 * column cannot fall through it.
 */
export function priceState(
  fact: PriceFact | null | undefined,
  newestAsOf: Date | null,
): PriceState {
  if (!fact || !newestAsOf) return "absent";

  // The read returns the best row it can find regardless of liveness — live
  // printings sort first — so a stale row here means no live printing exists
  // for this card at all. That is what "sold out" means and the only way the
  // state is reachable.
  if (fact.asOf.getTime() !== newestAsOf.getTime()) return "soldOut";

  if (fact.cents !== null) return "priced";
  if (fact.foilCents !== null || fact.etchedCents !== null) return "foilOnly";
  return "absent";
}

/** The figure a `priced` or `foilOnly` fact contributes. Null for the rest. */
export function priceOf(fact: PriceFact, state: PriceState): number | null {
  if (state === "priced") return fact.cents;
  if (state === "foilOnly") return fact.foilCents ?? fact.etchedCents;
  return null;
}

/**
 * Whole cents, never rounded. The locale is pinned: a bare `toLocaleString()`
 * resolves against the runtime's locale, which differs between the server
 * render and the browser, and a four-figure total would hydrate mismatched.
 */
export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * `foil` and `etched` each name which printing the figure belongs to, so the figure is
 * incomplete without it: a foil-only `$9.40` stated bare is the normal
 * printing's price, which is a figure the feed never gave.
 *
 * Lives here rather than in `BuyTag` because two surfaces format the same fact —
 * the tag draws the qualifier in its own ink, and the pending banner arrives
 * with the figure already a string.
 */
export function priceQualifier(fact: PriceFact, state: PriceState): string | null {
  if (state !== "foilOnly") return null;
  return fact.foilCents !== null ? priceCopy.tag.foil : priceCopy.tag.etched;
}

/** The figure and its qualifier as one run, for a caller with nowhere to put a span. */
export function formatPriceFigure(fact: PriceFact, state: PriceState): string | null {
  const cents = priceOf(fact, state);
  if (cents === null) return null;
  const qualifier = priceQualifier(fact, state);
  return qualifier ? `${formatCents(cents)} ${qualifier}` : formatCents(cents);
}

/**
 * The figure this row DRAWS, in cents, or null when it draws none.
 *
 * The one definition of that question. `comparePriceDesc` ranks on it, and so
 * does the deck list's ascending price order, which cannot be a negation of
 * this comparator: negating it would move the figure-less rows to the front and
 * reverse their own tiebreak, so reversing the order would reverse the meaning
 * of "we have no price for this". Both callers therefore ask for the rank and
 * decide what to do with a null themselves.
 */
export function priceRank(row: PricedRank, newestAsOf: Date | null): number | null {
  const state = priceState(row.price, newestAsOf);
  return row.price ? priceOf(row.price, state) : null;
}

/**
 * The Shopping list's order: dearest first, then everything with no figure at
 * all, and the name as the tiebreak.
 *
 * IT RANKS ON THE FIGURE THE ROW DRAWS. The rank comes out of `priceState` and
 * `priceOf` — the same pair the buy tag renders through — so a row's place in
 * the list and the number printed on it cannot disagree. A foil-only row is
 * ranked on its foil figure for that reason: it is the figure on screen.
 *
 * A `soldOut` or `absent` row has no figure, and that is NOT a price of zero.
 * One has sold out and the other was never stocked; ranked as 0 they would file
 * at the cheap end and read as the bargains of the list, which is the one
 * reading the feed's absence must never produce. They go last, among themselves
 * by name.
 *
 * The name tiebreak is not decoration. Without it the order of two equal prices
 * falls out of however the rows happened to arrive, so two renders of one
 * unchanged list can differ — and any test pinning the order passes by luck.
 * The name is not unique either — `cards.name` carries no constraint and the
 * rows are keyed by `oracleId` — so the id is the last clause rather than the
 * name being trusted to separate every pair.
 *
 * BY CODE POINT, NEVER `localeCompare`, for the same reason `sortDecks` spells
 * out: this list is rendered on the server and again in the browser, and
 * `localeCompare` reads whichever locale the runtime holds. Two equal prices
 * could land in one order in Node and another in a reader's browser, which is a
 * hydration difference rather than a preference.
 */
export function comparePriceDesc(
  a: PricedRank,
  b: PricedRank,
  newestAsOf: Date | null,
): number {
  const left = priceRank(a, newestAsOf);
  const right = priceRank(b, newestAsOf);
  if (left !== right) {
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  }
  return byCodePoint(a.name.toLowerCase(), b.name.toLowerCase())
    || byCodePoint(a.oracleId, b.oracleId);
}

/** See `comparePriceDesc`: locale-free, so the server and the browser agree. */
const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * What `comparePriceDesc` needs of a row: the fact the tag reads, and the name
 * that breaks a tie. Structural rather than `Pick<DeckDetailCard, …>` —
 * `grouping.ts` imports this module for `PriceFact`, so naming its type here
 * would close the cycle.
 */
type PricedRank = { oracleId: string; name: string; price?: PriceFact | null };

export type PricedCard = {
  quantity: number;
  price?: PriceFact | null;
};

export type PriceSummary = {
  totalCents: number;
  pricedCopies: number;
  totalCopies: number;
};

/**
 * COUNT COPIES, NOT ROWS. The `Shopping N` pill is derived through
 * `cardCopies`, and the strip's denominator must be the same figure or the two
 * disagree on screen. Each card's price is multiplied by its quantity for the
 * same reason: they describe one purchase.
 *
 * `soldOut` and `absent` contribute nothing to the total and count against the
 * denominator — that is precisely what "6 of 8 priced" names.
 */
export function summarisePrices(
  cards: readonly PricedCard[],
  newestAsOf: Date | null,
): PriceSummary {
  let totalCents = 0;
  let pricedCopies = 0;
  let totalCopies = 0;

  for (const card of cards) {
    totalCopies += card.quantity;
    const state = priceState(card.price, newestAsOf);
    const cents = card.price ? priceOf(card.price, state) : null;
    if (cents === null) continue;
    totalCents += cents * card.quantity;
    pricedCopies += card.quantity;
  }

  return { totalCents, pricedCopies, totalCopies };
}

export type ProvenanceForm = {
  behind: boolean;
  when: string;
};

/**
 * A date, not a duration: `12 August`, not `3 weeks ago`. Past the threshold a
 * weekday stops being unambiguous, so the line switches from weekday to date
 * at the same threshold that adds the behind clause.
 *
 * CALL THIS ON THE SERVER, ONCE, AND PASS THE RESULT DOWN. Both the locale and
 * the time zone are pinned here, but `now` is not: calling it again in the
 * browser would compare against a different clock and could flip `behind`
 * between the server render and hydration. The strip takes a `ProvenanceForm`,
 * not a `Date`, for that reason. The ingest stamps `as_of` in UTC and the
 * threshold is measured in whole days, so UTC is also the only zone in which
 * "last checked Monday" names the day the run actually happened.
 */
export function provenanceForm(newestAsOf: Date, now: Date): ProvenanceForm {
  const behind = now.getTime() - newestAsOf.getTime() > PRICE_STALE_AFTER_DAYS * DAY_MS;
  return {
    behind,
    when: behind
      ? newestAsOf.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          timeZone: "UTC",
        })
      : newestAsOf.toLocaleDateString("en-GB", {
          weekday: "long",
          timeZone: "UTC",
        }),
  };
}
