import type { SynergyCard } from "../commanders/synergy-cards";

/** A candidate row as the top-off list draws it.
 *
 *  Both extras are attached in the route rather than read here, and both are
 *  null on the half of the list that cannot use them: a price only reaches an
 *  unowned row, because an owned row draws no `BuyTag`, and availability only
 *  reaches an owned row, because `loadAvailability` is driven by the collection
 *  and an unowned card can never come back from it.
 *
 *  Null therefore means two different things per field and neither is an error
 *  state: for `price`, either the card was never priced or the read failed; for
 *  `availability`, either the card is unowned or the read failed. Both render
 *  as the absent case, which is what the design draws for a degraded read. */
/**
 * A card the top-off list can offer.
 *
 * Nothing added: `price` and `availability` moved onto `SynergyCard` itself when
 * the commander page's synergy panel needed the same two facts, and a second
 * shape carrying them would have been the same pair drifting in two places. The
 * alias stays because the name says which surface is asking, and because every
 * call site here reads better for it.
 */
export type TopOffCandidate = SynergyCard;

/** Every card the list can offer, in rank order and uncapped.
 *
 *  The cap is a property of the selection, not of the pool: the player sees the
 *  whole ranking and ticks up to the open slots inside it, so a pool truncated
 *  at `openSlots` would hide the cards each tick is being chosen over. The one
 *  exclusion is a card the deck already holds: a row the player cannot tick is
 *  a row the list has no reason to draw. */
export function listLastSlotsCandidates(args: {
  ranked: SynergyCard[];
  inDeckOracleIds: Set<string>;
}): SynergyCard[] {
  return args.ranked.filter((c) => !args.inDeckOracleIds.has(c.oracleId));
}
