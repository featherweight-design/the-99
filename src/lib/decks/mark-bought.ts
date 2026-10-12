// I got it's receipt (plan `2026-10-10-i-got-it.md`, audit gap 5): what a purchase did, read from
// the card's availability either side of the write (`ReceiptSnapshots`, taken under the write's
// lock). Pure.
import { allocateClaims } from "./allocate";
import { availabilityState, type Availability } from "./availability";

/**
 * A cart purchase's history source: `shopping:cart:` and the line's deck ids. Recording the decks
 * on the entry is what lets the cart's undo leave out exactly those decks (`ignoreDeckIds` is
 * checked against this list), where a bare `shopping:cart` would trust whatever ids an undo sent.
 */
const CART_SOURCE = "shopping:cart:";

export function cartSource(deckIds: readonly string[]): string {
  return CART_SOURCE + deckIds.join(",");
}

/** The deck ids a cart entry recorded, or null for any other source. */
export function cartSourceDecks(source: string | null | undefined): string[] | null {
  return source?.startsWith(CART_SOURCE) ? source.slice(CART_SOURCE.length).split(",").filter(Boolean) : null;
}

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
 * The cart's receipt (S3, S4, S6), read after the write and never assumed (lock 7), and read off
 * ONE snapshot: who holds each copy after the write (`allocateClaims`), and before it.
 *
 * A deck on the line is short of what it asks less what the allocation gives it, which for a brew
 * includes the spare it reads (each brew against the committed claims alone, as its own Shopping
 * row reads it). A deck off the line is named covered when the copies went to it instead (a senior
 * deck the player unselected, say): short before, not after, counting only what it HOLDS, so a
 * brew's spare is never a copy taken. A line deck the read lists no claim for (a proxy printed
 * since, or a draft holding the card its newest version does not) buys nothing now: covered.
 *
 * Names come from the read's claims, so a deck renamed since the cart loaded prints its new name.
 * A deck with no claim has no name here and reads `""`: the caller names it by id from its list.
 */
export function cartReceiptFacts(before: Snap, after: Snap, deckIds: string[]): CartReceiptFacts {
  const claimants = after ? allocateClaims(after) : [];
  const names = new Map(claimants.map((c) => [c.deckId, c.deckName]));
  const facts: CartReceiptFacts = { covered: [], still: [] };
  const needs = new Map(claimants.map((c) => [c.deckId, Math.max(c.quantity - c.allocated, 0)]));
  for (const deckId of deckIds) {
    const deckName = names.get(deckId) ?? "";
    const need = needs.get(deckId) ?? 0;
    if (need > 0) facts.still.push({ deckId, deckName, need });
    else facts.covered.push({ deckId, deckName });
  }
  const unheld = (cs: ReturnType<typeof allocateClaims>) =>
    new Map(cs.map((c) => [c.deckId, Math.max(c.quantity - (c.brew ? c.granted : c.allocated), 0)]));
  const was = unheld(before ? allocateClaims(before) : []);
  const line = new Set(deckIds);
  for (const [deckId, now] of unheld(claimants)) {
    if (!line.has(deckId) && now === 0 && (was.get(deckId) ?? 0) > 0) {
      facts.covered.push({ deckId, deckName: names.get(deckId) ?? "" });
    }
  }
  return facts;
}

/**
 * `a` with its reservations granted as `prior` would grant them: what the claim model's
 * `reservations` CTE computes, in TypeScript, over one snapshot. Each reservation in `prior`
 * (oldest first, the model's order) wants its copies capped at the deck's LIST ask, and is
 * granted that less every earlier reservation's want, out of the copies no committed commander
 * holds. A deck `prior` does not name is granted nothing.
 *
 * What the cart's receipt builds its `before` from when a press also made a pick: the snapshot
 * after the write, less the copies added, with the reservations as they stood before the pick. One
 * snapshot either side, so no deck edit landing between two reads can be credited to the purchase.
 */
export function regrant<A extends Pick<Availability, "owned" | "claims">>(
  a: A,
  prior: readonly { deckId: string; copies: number }[],
): A {
  const commanderOf = (c: A["claims"][number]) => c.commanderCopies ?? (c.commander ? 1 : 0);
  const heldAsCommander = a.claims.filter((c) => c.mature).reduce((n, c) => n + commanderOf(c), 0);
  const supply = Math.max(a.owned - heldAsCommander, 0);
  const granted = new Map<string, number>();
  let wanted = 0;
  for (const r of prior) {
    const claim = a.claims.find((c) => c.id === r.deckId);
    if (!claim) continue;
    const want = Math.min(r.copies, Math.max(claim.quantity - commanderOf(claim), 0));
    granted.set(r.deckId, Math.min(want, Math.max(supply - wanted, 0)));
    wanted += want;
  }
  return { ...a, claims: a.claims.map((c) => ({ ...c, granted: granted.get(c.id) ?? 0 })) };
}
