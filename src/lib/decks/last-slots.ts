import type { SynergyCard } from "../commanders/synergy-cards";
import type { CandidateFacts } from "../bracket/delta";

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

/**
 * A candidate with its card-note facts attached, as the deck page hands them down.
 *
 * A SEPARATE TYPE rather than a field on `SynergyCard`, because `SynergyCard` is drawn on
 * surfaces that have no deck to be a candidate FOR — `/commanders` lists it with no facts to
 * carry — and an optional field there would be the same trap this payload was already in:
 * present in the type, populated by nobody, drawn by nobody.
 *
 * `facts` is null where the read failed or the card carries none. Round 4's note draws nothing
 * for either, which is why one absence serves both.
 */
export type TopOffCandidateWithFacts = TopOffCandidate & {
  facts: CandidateFacts | null;
  /**
   * Combo awareness states 2 and 3: adding this card completes a two-card combo whose other
   * half is ALREADY IN THIS DECK, and `comboPartner` is that half.
   *
   * Deck-scoped, which is why it lives on this type and not on `SynergyCard` — the same
   * reason `facts` does. `/commanders` draws the same card with no deck to complete anything
   * in, and an optional field there would be present in the type, populated by nobody and
   * drawn by nobody.
   *
   * The two states differ only by whether the reader OWNS this card, which every host already
   * draws with the shipped `OwnershipDot` and `BuyTag`. Nothing here needs to know which it is.
   */
  comboPartner: { oracleId: string; name: string } | null;
};

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
  return args.ranked
    .filter((c) => !args.inDeckOracleIds.has(c.oracleId))
    .filter((c) => !arguesAgainstItself(c));
}

/**
 * A card the list may tick BY DEFAULT — owned, with a copy free to sleeve.
 *
 * The seed and the bulk `Select N from my collection` control read this one
 * predicate rather than each filtering on `owned` in their own file. They
 * already drifted once in the opposite direction: the seed was narrowed to free
 * copies while the bulk control kept ticking every owned card, which left a
 * one-click path to exactly the mechanic the seed had stopped doing.
 *
 * A card owned with every copy sleeved elsewhere is still OFFERED, and still
 * tickable by hand — the player may reclaim a copy. What it is not is a default:
 * arriving ticked, it is indistinguishable from one they can sleeve tonight, and
 * committing it costs a purchase or a card out of another deck.
 *
 * A null `availability` is no row — an unowned card, or a read that could not
 * reach — and reads as free everywhere else in the app, so it stays seedable: a
 * failed read must not quietly empty the promise the strip makes.
 */
export function canSeed(c: SynergyCard): boolean {
  return c.owned && (c.availability === null || c.availability.free > 0);
}

/** A card EDHREC ranks below its own baseline — see the exclusion above. */
function arguesAgainstItself(c: SynergyCard): boolean {
  return c.synergyPts !== null && c.synergyPts < 0;
}

/**
 * Whether an empty pool is empty BECAUSE of the negative cut.
 *
 * `synergyCopy.lastSlots.short` explains an empty pool as the collection having
 * run out with nothing left that EDHREC ranks. Since the tail is cut that is no
 * longer the only way to empty it: a deck holding every positively-ranked card
 * leaves a ranking that is entirely negative — reachable late in a build, and
 * not rare — and the shipped sentence is then false in both of its clauses.
 * EDHREC ranked those cards, and what it said was that they belong here less
 * than in decks generally.
 *
 * Asked of the same two inputs the list is built from rather than returned
 * beside it, so no caller can hold a count that disagrees with the rows.
 */
export function poolEmptiedByNegativeCut(args: {
  ranked: SynergyCard[];
  inDeckOracleIds: Set<string>;
}): boolean {
  const offerable = args.ranked.filter((c) => !args.inDeckOracleIds.has(c.oracleId));
  return offerable.length > 0 && offerable.every(arguesAgainstItself);
}
