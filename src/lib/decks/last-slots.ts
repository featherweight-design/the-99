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
 *  at `openSlots` would hide the cards each tick is being chosen over.
 *
 *  Two exclusions. A card the deck already holds — a row the player cannot tick
 *  is a row the list has no reason to draw. And a card whose synergy is
 *  NEGATIVE, which is EDHREC saying the card appears in this commander's decks
 *  LESS than in decks generally: an argument against the card, printed under a
 *  heading that offers it. The list is a suggestion, and a suggestion carrying
 *  its own counter-evidence is one the player has to overrule to ignore.
 *
 *  A NULL synergy is kept. Null is no reading — an unscored card, or a degraded
 *  read — and silence is not evidence against a card. Only a figure that argues
 *  against it is. (Measured on the shipped index: no row scores exactly 0, so
 *  the boundary is not load-bearing; it is written as `< 0` because that is the
 *  claim, not because of where the data happens to sit.) */
export function listLastSlotsCandidates(args: {
  ranked: SynergyCard[];
  inDeckOracleIds: Set<string>;
}): SynergyCard[] {
  return args.ranked.filter(
    (c) =>
      !args.inDeckOracleIds.has(c.oracleId)
      && !(c.synergyPts !== null && c.synergyPts < 0),
  );
}
