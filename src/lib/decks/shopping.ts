// What the Shopping filter holds. One selector, three consumers: the rows the
// filter renders, the price strip's total and denominator, and both Mana Pool
// `add-deck` hrefs.
//
// It lives here rather than in decklist.tsx because the export dialog composed
// its own list from a plain `!c.owned` and the two diverged — that list carried
// unowned basics the filter refuses to show and dropped the spoken-for cards
// the filter puts front and centre, so the export link bought a basket the
// player never saw. One predicate is what makes the two doors one promise.

import type { DeckDetailCard } from "./grouping";
import { cardTypeGroup, isBasicLand } from "./grouping";
import { availabilityState, type Availability } from "./availability";
import type { DeckCommander } from "./read";

/**
 * A card you don't own, or one you own whose copies are already sleeved into
 * committed decks — `over` from this deck's own vantage (amendment 5, #281).
 * Both are one trip to a shop.
 *
 * The two halves cannot overlap: `availabilityState`'s first guard is
 * `owned <= 0 → free`, so an unowned card is never `over`.
 *
 * `selfExcluded` is mandatory and `free` is read, never recomputed. The map came
 * from a query given this deck's id, so on this list
 * `free = owned − ownClaim − seniorHard`; `owned − hard` is the off-decklist
 * formula and is silently wrong here (Addendum 2 §6 / R5 §6).
 *
 * Basics are never in Shopping — the fill never buys them, and asserting it here
 * means a future change to the fill fails this filter loudly.
 */
export function isShoppingCard(c: DeckDetailCard): boolean {
  if (isBasicLand(c.typeLine)) return false;
  // BEFORE the ownership test, which is the whole point: a proxied card is
  // usually one the player owns no copy of, so `!c.owned` would put it on the
  // list the moment it was printed. This is the client-side twin of the
  // `list_claims` anti-join, and the two must agree or the strip and the
  // server's buy rows bill different baskets.
  if (c.proxied) return false;
  if (!c.owned) return true;
  const a = c.availability;
  // A missing read degrades to the free rendering, as the builder always has:
  // the contested rows are simply absent and the list is today's list.
  return a ? availabilityState(a, { selfExcluded: true }) === "over" : false;
}

/**
 * A suggested add the player owns but would still have to buy (bug batch 2026-10-12, Hugh): no copy
 * free for this deck (`none free`) or already overcommitted (`short N`). It is Shopping's own rule
 * (`isShoppingCard` on an owned card) read as if the add had landed: an add the deck does not hold
 * yet is read with `selfExcluded` false, where `hard` (none free) is exactly what becomes `over` once
 * it is applied, and an add the deck already holds is read self-excluded, where only `over` occurs.
 * A copy held by a draft (`soft`) is not a purchase, as on the deck page. Basics never buy.
 */
export function suggestionNeedsBuy(args: {
  owned: boolean;
  availability: Availability | null;
  selfExcluded: boolean;
  typeLine: string;
}): boolean {
  if (!args.owned || !args.availability || isBasicLand(args.typeLine)) return false;
  const state = availabilityState(args.availability, { selfExcluded: args.selfExcluded });
  return state === "hard" || state === "over";
}

/** A card on the Shopping list that is there because it is spoken for. */
export function isSpokenFor(c: DeckDetailCard): boolean {
  return c.owned && isShoppingCard(c);
}

/**
 * A commander as a Shopping row: the decklist row's shape, marked `commander`, at one copy.
 * Neither commander is a `deck_cards` row, so without this the list never billed the one card a
 * player cannot start without, while `loadDeckBuyRows` (which unions both into `list_claims`)
 * billed it on the tile and the roll-up (H28).
 *
 * `owned` absent reads as owned, which is what every surface assumed before the deck page carried
 * it: a fixture with no collection behind it bills nothing.
 */
export function commanderAsRow(c: DeckCommander): DeckDetailCard {
  const owned = c.owned ?? true;
  return {
    oracleId: c.oracleId,
    name: c.name,
    typeLine: c.typeLine,
    cardTypeGroup: cardTypeGroup(c.typeLine),
    // No role: a commander is not counted toward a role's baseline on this list.
    role: "other",
    cmc: c.cmc ?? 0,
    owned,
    proxied: c.proxied,
    quantity: 1,
    auto: false,
    availability: c.availability ?? null,
    price: c.price ?? null,
    manaCost: c.manaCost,
    imageUri: c.imageUri,
    // The decklist row's rule: an unowned card has no copy in hand to print a name.
    printedName: owned ? (c.printedName ?? null) : null,
    printedSetCode: null,
    printedCollectorNumber: null,
    commander: true,
  };
}

/**
 * The commanders the Shopping list bills, commander first: each one through `isShoppingCard`, the
 * same predicate every list row passes, so an unowned commander is a row, a proxied or freely owned
 * one is not, and an owned one sleeved elsewhere is spoken for.
 *
 * NONE FOR A DECK WITH NO BODY (Hugh, 2026-10-02), `loadDeckBuyRows`' rule: a deck with every card
 * removed bills nothing until it holds a card again. `body` is the deck's list rows.
 */
export function commanderShoppingRows(
  commander: DeckCommander,
  partner: DeckCommander | null,
  body: readonly unknown[],
): DeckDetailCard[] {
  if (body.length === 0) return [];
  return [commander, ...(partner ? [partner] : [])].map(commanderAsRow).filter(isShoppingCard);
}
