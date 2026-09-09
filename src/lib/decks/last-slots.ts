import type { SynergyCard } from "../commanders/synergy-cards";
import type { Availability } from "./availability";
import type { PriceFact } from "./price";

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
export type TopOffCandidate = SynergyCard & {
  price: PriceFact | null;
  availability: Availability | null;
};

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
