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
  /** Cards the draft added, bucketed, basics excluded. */
  adds: DraftAdd[];
  /** The same adds as raw diff entries, index-aligned with `adds`. `DraftAdd`
   *  carries `needed` and `shortfall` but not the `from`/`to` pair, and both the
   *  banner and the review row print that pair for a quantity move. */
  addChanges: DraftChange[];
  /** Cards the draft cut, basics excluded, each carrying `from` and `to`. */
  removes: DraftChange[];
  /** True when the draft differs from the version ONLY in basic lands. Basics are
   *  outside the availability model, so they are excluded from every list and
   *  every figure — but a deck whose land count moved has genuinely changed and
   *  must still be committable. Without this flag `changeCount` is 0, the banner
   *  takes its clean branch, and a real edit has no route to a commit. */
  basicsChanged: boolean;
  /** Whether ANY basic land moved, alone or alongside other cards.
   *
   *  `basicsChanged` above answers a narrower question — it is set only when
   *  NOTHING else moved — so on a mixed draft it reads false and cannot be used
   *  to ask "does this draft survive without its non-basic changes?". The review
   *  page asks exactly that when its last drawn row is put back: a draft that
   *  also moved a basic is still a draft, and one that did not has dissolved
   *  and the route redirects. */
  basicsMoved: boolean;
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
   * NOT `DraftAdd.heldBy`, which is every mature claimant and includes the two
   * holders no pull can come out of: a deck with pending changes of its own, and
   * a deck holding the card as its commander. `heldBy` answers "who has it" — the
   * question the availability marker asks — and naming one of those decks in an
   * offer to pull promises an act the server refuses. Filtered through
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
   *  holder that is neither pending nor holding it as a commander. Drawn as a
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
};

/** `adds.length + removes.length` — the figure every count chip is built on.
 *  Basics are not in either list, so this is a count of *nameable* changes and
 *  not a test of whether the draft differs. Use `hasChanges` for that. */
export function changeCount(state: DraftState): number {
  return state.adds.length + state.removes.length;
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
  return state.removes.reduce((sum, r) => sum + (r.from - r.to), 0);
}

/** Whether the draft differs from the version at all. A basics-only edit counts
 *  here and in no figure, which is the only honest split: the app cannot price
 *  an Island, and it must not tell a player who cut three of them that the deck
 *  is unchanged. */
export function hasChanges(state: DraftState): boolean {
  return changeCount(state) > 0 || state.basicsChanged;
}

/**
 * The holders a pull could actually be offered against.
 *
 * Both guards, and both of them the server's own: a deck with pending changes
 * would have them swept into a version nobody asked for, and no route releases a
 * commander. A control that can only fail is worse than no control.
 *
 * Filtered off `claims` rather than through `hardDecks`, whose projection drops
 * the two guard flags — the maturity test is repeated here for that reason.
 */
export function releasableClaims(a: Availability | undefined): DeckClaim[] {
  if (!a) return [];
  return a.claims.filter((c) => c.mature && !c.pending && !c.commander);
}

/**
 * The one claim a review row draws its control against, or null for a row with
 * no sleeved holder — an unowned card, or a free one.
 *
 * A releasable holder wins, because that row gets the offer. Below that a
 * commander claim beats a pending one, matching the control's own guard order:
 * a pending deck can be opened and released, a commander never can, so naming
 * the permanent obstacle is the more useful of the two.
 */
export function pullCandidate(a: Availability | undefined): DeckClaim | null {
  const releasable = releasableClaims(a)[0];
  if (releasable) return releasable;
  const sleeved = (a?.claims ?? []).filter((c) => c.mature);
  return sleeved.find((c) => c.commander) ?? sleeved.find((c) => c.pending) ?? null;
}
