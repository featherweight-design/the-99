// I got it's receipt (plan `2026-10-10-i-got-it.md`, audit gap 5): what a purchase did, read from
// the card's availability either side of the write (`ReceiptSnapshots`, taken under the write's
// lock). Pure.
import { allocateClaims } from "./allocate";
import { availabilityState, type Availability } from "./availability";

/** The most copies one press records (call D). */
export const MARK_BOUGHT_MAX = 20;

export type ReceiptFacts = {
  /**
   * The OTHER committed decks whose allocated copies rose: seniority gave them the new copy. The
   * source deck is in the queue (a source deck senior to the rest takes the copy and this is empty)
   * and dropped only here, from the names the receipt prints.
   */
  tookCopy: { deckId: string; deckName: string; copies: number }[];
  /** Copies the source deck still needs, from its own vantage: the figure its Shopping row draws. */
  stillNeeds: number;
};

type Snap = Pick<Availability, "owned" | "claims"> | null;

export function receiptFacts(
  before: Snap,
  after: Snap,
  afterFromDeck: Pick<Availability, "owned" | "free" | "soft"> | null,
  sourceDeckId: string,
): ReceiptFacts {
  // What each deck HOLDS: a committed deck its allocation, a brew only what the player gave it.
  // A brew's soft share is not a copy taken (every brew reads the same leftover), so naming it
  // would tell the player a copy went to several decks at once.
  const held = (c: ReturnType<typeof allocateClaims>[number]) => (c.brew ? c.granted : c.allocated);
  const allocated = (a: Snap) =>
    new Map(a ? allocateClaims(a).map((c) => [c.deckId, c]) : []);
  const was = allocated(before);
  const tookCopy = [...allocated(after).values()]
    .filter((c) => c.deckId !== sourceDeckId)
    .map((c) => {
      const prior = was.get(c.deckId);
      return { deckId: c.deckId, deckName: c.deckName, copies: held(c) - (prior ? held(prior) : 0) };
    })
    .filter((c) => c.copies > 0);
  return { tookCopy, stillNeeds: stillNeedsOf(afterFromDeck) };
}

/** Copies a deck still needs, from its own vantage: the figure its Shopping row draws. */
function stillNeedsOf(fromDeck: Pick<Availability, "owned" | "free" | "soft"> | null): number {
  return fromDeck && availabilityState(fromDeck, { selfExcluded: true }) === "over" ? -fromDeck.free : 0;
}

export type CartReceiptFacts = {
  /**
   * Every deck the purchase covered, as the read says (S6): the line's decks that need no more
   * copies now, in the line's order, then any deck off the line that the copies went to instead (a
   * senior deck the player unselected, say), which needed copies before the write and none after.
   */
  covered: { deckId: string; deckName: string }[];
  /** The line's decks still short, with what each still needs from its own vantage. */
  still: { deckId: string; deckName: string; need: number }[];
};

/**
 * The cart's receipt (S3, S4, S6), read after the write and never assumed (lock 7). A deck on the
 * line is read from its own vantage, the figure its Shopping row draws. A deck off the line is
 * read from who holds each copy either side of the write (`allocateClaims`, as `receiptFacts`
 * does): what it holds against what it asks. A line deck whose own vantage reads nothing short (a
 * proxy printed since, say) is covered: it buys nothing now.
 *
 * Names come from the read's claims, so a deck renamed since the cart loaded prints its new name.
 * A deck the read lists no claim for (that proxy, or a draft holding the card its newest version
 * does not) has no name here and reads `""`: the caller names it by id from its own list.
 */
export function cartReceiptFacts(
  before: Snap,
  after: Snap,
  afterFromDecks: Record<string, Pick<Availability, "owned" | "free" | "soft"> | null>,
  deckIds: string[],
): CartReceiptFacts {
  const names = new Map((after?.claims ?? []).map((c) => [c.id, c.name]));
  const facts: CartReceiptFacts = { covered: [], still: [] };
  for (const deckId of deckIds) {
    const deckName = names.get(deckId) ?? "";
    const need = stillNeedsOf(afterFromDecks[deckId] ?? null);
    if (need > 0) facts.still.push({ deckId, deckName, need });
    else facts.covered.push({ deckId, deckName });
  }
  // What each claimant is short of: a committed deck against its allocation, a brew against only
  // what the player gave it (its soft share is a leftover every brew reads, never a copy held).
  const short = (a: Snap) => new Map(a
    ? allocateClaims(a).map((c) => [c.deckId, Math.max(c.quantity - (c.brew ? c.granted : c.allocated), 0)])
    : []);
  const was = short(before);
  const line = new Set(deckIds);
  for (const [deckId, now] of short(after)) {
    if (!line.has(deckId) && now === 0 && (was.get(deckId) ?? 0) > 0) {
      facts.covered.push({ deckId, deckName: names.get(deckId) ?? "" });
    }
  }
  return facts;
}
