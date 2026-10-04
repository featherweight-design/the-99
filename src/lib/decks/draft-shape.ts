// What a draft IS, and the two questions every surface asks of it — with no
// route to the database.
//
// Split from `draft-state.ts` for one reason: the banner is a "use client"
// component and needs `changeCount` and `hasChanges` as values, while the reader
// beside them imports `db`. Client-bundle safety is a test in this repository
// (`src/lib/client-bundle-safety.test.ts`), so the arithmetic lives where a
// client component can reach it and the queries stay behind the server module
// that re-exports both.

import type { Availability, DeckClaim } from "./availability";
import type { AddBucket, BucketedAdd, DraftChange } from "./draft-diff";
import type { DeckVersion } from "./versions";
import type { CommanderPair } from "../commander-change/pending";
import type { CommanderRows } from "../commander-change/draft-rows";

/**
 * An add as every draft surface reads it.
 *
 * `bucket` is null when the availability read failed, and that is the whole
 * reason this type exists rather than `BucketedAdd`: a card whose claims could
 * not be read is not an unowned card, and `bucketAdds` over an empty claimant
 * map would call it one. A null bucket stands `shortfall` down to zero with it —
 * with nothing known about free copies there is no purchase to quote.
 */
export type DraftAdd = Omit<BucketedAdd, "bucket"> & { bucket: AddBucket | null };

export type DraftState = {
  /** Null for a brew. Every pending surface is absent on a brew: there is no
   *  version for the draft to be pending against. */
  version: DeckVersion | null;
  /** Cards the draft added, bucketed. Basics are in the list — a basic buckets
   *  `free` and costs nothing, which is not the same as being invisible. Five
   *  Swamps cut and five other lands added is the edit this page exists to
   *  describe. */
  adds: DraftAdd[];
  /** The same adds as raw diff entries, index-aligned with `adds`. `DraftAdd`
   *  carries `needed` and `shortfall` but not the `from`/`to` pair, and both the
   *  banner and the review row print that pair for a quantity move. */
  addChanges: DraftChange[];
  /** Cards the draft cut, each carrying `from` and `to`. Basics included, for
   *  the reason they are included in `adds`. */
  removes: DraftChange[];
  /** Oracle name per changed card, both lists — what the banner's inline
   *  density says at six changes or fewer. */
  names: Map<string, string>;
  /** Printed mana cost per changed card, both lists, for the cost track the
   *  inline density draws beside each name. Absent for a card the catalog gives
   *  no cost, where the track draws nothing rather than a zero. */
  costs: Map<string, string>;
  /**
   * One copy's price, formatted, for the adds that carry a purchase.
   *
   * Absent for a free add, for every remove, and for a card the feed could not
   * price — an absent entry means "no figure to show", never "$0.00". A UNIT
   * price, matching the shipped buy tag rather than multiplying by the
   * shortfall, so the banner's tile and the row's tag cannot quote the same
   * card differently.
   */
  prices: Map<string, string>;
  /**
   * The deck a pull could actually be taken from, per add that offers one.
   *
    * NOT `DraftAdd.heldBy`, which includes the holders no pull can come out of:
   * a deck holding the card as its commander, or one that has locked it. Naming one of those decks in an offer to pull promises an act
   * the server refuses. Filtered through
   * `releasableClaims`, the same guard `pullableCount` counts with, so the hint
   * and the count can never disagree. Absent when no holder is releasable.
   */
  pullFrom: Map<string, string>;
  /**
   * Whether the claim model could be read at all.
   *
   * False only when the availability read failed. Every money figure below is
   * zero or null in that case and states nothing — NOT "this commit is free",
   * which is what an empty claimant map would have made them say. A surface with
   * a false here draws the change lists and no purchase.
   */
  claimsKnown: boolean;
  /** Copies the player must obtain: the shortfall over every unfree add. Not a
   *  row count — one card wanted three times is three copies. */
  buyCount: number;
  /** Rows in `adds` that are not free. The banner's `unfree` figure. */
  unfreeCount: number;
  /** Adds a deliberate pull could satisfy: bucket `claimed`, and at least one
   *  holder that neither holds it as a commander nor has locked it. Drawn as a
   *  count only — which row offers which control is `loadDraftRows`' answer. */
  pullableCount: number;
  /**
   * Formatted, because the figure is only ever printed. Null when NO copy could
   * be priced, which is not the same as a purchase of nothing: read it beside
   * `unfreeCount`, and say the free-copy sentence only when that is zero. A real
   * $0.00 is printed rather than nulled — the feed stocking a card at nothing is
   * a price, and hiding it would quote the purchase as unpriceable.
   */
  total: string | null;
  /**
   * Copies of the purchase that carry a price, against `buyCount` copies asked
   * for. Kept beside `total` because a figure over partial coverage reads as a
   * complete one: at 4 of 9 the total is real and the purchase is bigger than it,
   * and the shipped `priceCopy.strip.pricedClause` is how every other surface
   * says so. Equal to `buyCount` when the feed had a price for everything.
   */
  pricedCopies: number;
  /**
   * The newest `as_of` in the price table, or null when nothing was read.
   *
   * Travels with the state because `PriceFact.asOf` alone cannot decide whether
   * a price is live — `priceState` compares it to this, and a row equal to the
   * maximum is the only definition of "stocked now" this codebase has. A drawn
   * row carries the raw fact, so without this figure beside it a consumer either
   * repeats the whole price read or prints a sold-out card at its last price.
   */
  newestAsOf: Date | null;
  /**
   * The commander the draft moved to, against the version's, or null when it did
   * not move. A pending change like any card row: it counts once in
   * `changeCount`, so a swap alone raises the banner and admits the review page.
   *
   * Optional only so a fixture built before commanders could change still types;
   * the reader always sets it, and absent reads as null. Always null while
   * `CHANGE_COMMANDER_ENABLED` is off, because no read compares the columns then.
   */
  commander?: { from: CommanderPair; to: CommanderPair } | null;
  /** The moved commanders as the banner and the review page draw them; set with `commander`. */
  commanderRows?: CommanderRows | null;
};

function pairIds(pair: CommanderPair): string[] {
  return [pair.commanderOracleId, pair.partnerOracleId].filter((id): id is string => id !== null);
}

/** `adds.length + removes.length`, plus one when the commander moved — the
 *  figure every count chip is built on, and the whole test of whether the draft
 *  differs. Every card the draft moved is in one of those two lists, basics
 *  included, and a new commander (or pair) is one change however many halves it
 *  swapped; `hasChanges` is this figure against zero. */
export function changeCount(state: DraftState): number {
  return state.adds.length + state.removes.length + (state.commander ? 1 : 0);
}

/**
 * Copies going back in the pool when the draft commits.
 *
 * COPIES, not rows: `3 → 1` is one remove that releases two, and every surface
 * that prints this figure prints it beside `buyCount`, which is a copy count.
 * Counting rows there would tell a player who cut two copies of one card that
 * one card comes back, and disagree with the claim delta the commit actually
 * makes.
 */
export function releasedCopies(state: DraftState): number {
  const cut = state.removes.reduce((sum, r) => sum + (r.from - r.to), 0);
  if (!state.commander) return cut;
  // A commander is one copy. One that leaves the command zone releases it,
  // unless it traded into the 99, where the add row holds that copy; one that
  // arrives FROM the 99 keeps the copy its remove row counted as released.
  const from = pairIds(state.commander.from);
  const to = pairIds(state.commander.to);
  const added = new Set(state.addChanges.map((a) => a.oracleId));
  const removed = new Set(state.removes.map((r) => r.oracleId));
  const leaving = from.filter((id) => !to.includes(id) && !added.has(id)).length;
  const arrivingFromBody = to.filter((id) => !from.includes(id) && removed.has(id)).length;
  return cut + leaving - arrivingFromBody;
}

/** Whether the draft differs from the version at all. The app cannot price an
 *  Island, and it must not tell a player who cut three of them that the deck is
 *  unchanged — so the Islands are rows like any other, and this is one figure
 *  against zero rather than a count beside a flag. */
export function hasChanges(state: DraftState): boolean {
  return changeCount(state) > 0;
}

/**
 * The holders a pull could actually be offered against.
 *
 * Two guards are the server's own: no route releases a commander, and a card the
 * player locked in a deck stays there. A control that can only fail is worse than
 * no control.
 *
 * `senior` is the third, and it is arithmetic rather than a refusal. A junior
 * sleeved claim is already outside this deck's `free`, so the server would take
 * the copy, empty that deck's slot, and leave the shortfall exactly where it was.
 *
 * Filtered off `claims` rather than through `hardDecks`, whose projection drops
 * the flags — the maturity test is repeated here for that reason.
 */
export function releasableClaims(a: Availability | undefined): DeckClaim[] {
  if (!a) return [];
  // A PENDING holder is releasable (Hugh, 2026-09-27): the pull joins its draft rather than
  // committing it, so there is nothing of the owner's to sweep into a version.
  return a.claims.filter((c) => c.mature && c.senior && !c.commander && !c.locked);
}

/**
 * The one claim a review row draws its control against, or null for a row with
 * no sleeved holder — an unowned card, or a free one.
 *
 * A releasable holder wins, because that row gets the offer. Below that a
 * commander claim beats a locked one, matching the control's own guard order:
 * naming the more permanent obstacle is the more useful of the two.
 */
export function pullCandidate(a: Availability | undefined): DeckClaim | null {
  const releasable = releasableClaims(a)[0];
  if (releasable) return releasable;
  const sleeved = (a?.claims ?? []).filter((c) => c.mature);
  // A LOCKED claim is a guard like the commander one (L2): `PullControl` draws its tag and no
  // offer, so the row says the spare copy is locked in that deck. The commander goes first, by
  // permanence: it never moves, and a lock is the player's own choice in that deck. `locked` is only ever set
  // with NEVER_CUT_ENABLED on.
  return sleeved.find((c) => c.commander) ?? sleeved.find((c) => c.locked) ?? null;
}

/**
 * Every claim a reader could be asked to pick between, when a card is held by
 * more than one deck that can give it up (addendum R1, `design_handoff_the99_pull_source`).
 *
 * Named `pullSourceChoices` rather than `pullSources` — `availability.ts` already exports a
 * `pullSources` (the hard, senior claimants a pull could take from, projected to `HardDeck[]`
 * for the marker strings) that answers a different, narrower question and returns a different
 * shape; this one is the FULL picker list for the UI, every claim included for display.
 *
 * `claims` arrives ordered alphabetically by deck NAME (`availability-query.ts`'s
 * `jsonb_agg(... order by cd.name, cd.deck_id)`), not by commit order — so this
 * sorts by `since` itself rather than assuming the array already reflects it.
 * Ascending: the longest-committed source leads, which is where `pullCandidate`'s
 * own first-match behaviour already lands when there is exactly one releasable
 * claim and no sort is needed to see it.
 *
 * The filter is a SUPERSET of `releasableClaims`: a locked or commander claim is
 * included for DISPLAY, as a disabled row with its reason, even though neither
 * is ever pullable — matching `pullCandidate`'s own fallback, which already
 * names them rather than returning null. A claim that is none of the three
 * (a junior sleeved holder) is excluded, same as today: nothing a pull can
 * reach and nothing a guard can explain.
 */
export function pullSourceChoices(a: Availability | undefined): DeckClaim[] {
  if (!a) return [];
  return a.claims
    .filter((c) => c.mature && (c.senior || c.locked || c.commander))
    .slice()
    .sort((x, y) => (x.since ?? Infinity) - (y.since ?? Infinity));
}

/**
 * The ownership dot's third state: the player owns a copy of this card and every
 * copy that could have covered the add is sleeved in another deck.
 *
 * The bucket cannot answer it. `claimed` now means "a pull would relieve this",
 * which is a narrower question: a card whose only sleeved holder is junior to
 * this deck buckets `unowned`, because taking that copy would move no figure —
 * and the copy is spoken for all the same. Reading the dot off the bucket paints
 * that row as a free owned copy, which is the one thing it is not.
 *
 * `shortfall` is part of the question rather than a second test beside it. A
 * player owning four copies and adding one is not short, and another deck
 * holding one of the four says nothing about this row.
 */
export function heldElsewhere(
  a: Availability | undefined | null,
  shortfall: number,
): boolean {
  return shortfall > 0 && (a?.claims ?? []).some((c) => c.mature);
}

/**
 * Whether a row's `from → to` pair says anything its column heading did not.
 *
 * `0 → 1` and `1 → 0` are exactly what `Coming in` and `Going out` state above
 * the rows, so printing the pair there restates the heading beside every name.
 * Every other shape carries copies nothing else on the page holds.
 *
 * Here rather than in each of the three surfaces that draws a diff — the review
 * page, the pending banner and the version rail — because they were three copies
 * of `from > 0 && to > 0`, which was the same rule only for as long as no row
 * could move more than one copy: a card is sleeved singly, so a whole cut was
 * always `1 → 0`. Basic lands are drawn now, and a deck that cut all five of its
 * Swamps printed a bare `Swamp` on all three — five cards coming out of the
 * sleeve, stated as though they were one, which is the defect this round exists
 * to fix. One predicate is what stops the three from drifting apart again.
 */
export function printsPair(change: { from: number; to: number }): boolean {
  return change.from > 1 || change.to > 1;
}
