/**
 * One deck's claim on one card: which deck, how many copies it asks for, and
 * whether that deck is sleeved. Named rather than inlined because the shape has
 * now widened twice — from a bare name, to `{id, name}`, to this — and each
 * widening had to be repeated at the SQL row, the model and the marker. One
 * definition means the next change is one edit.
 *
 * `quantity` is the deck's whole ask, commander included: a deck whose commander
 * also sits on its own list contributes ONE claim of `1 + listQuantity`, not two.
 *
 * `mature` is what makes the claim hard or soft, and it now means SLEEVED: the
 * deck has a committed version. It is no longer a body-size test. A player who
 * reaches 99 cards has decided nothing; a player who commits has said the list
 * is the one going in the sleeves, and only that says a copy is spoken for.
 * The key keeps the name because `hardDecks` and every consumer of the receipt
 * read it, so renaming it is a separate change with its own blast radius.
 *
 * It is carried per claim rather than recomputed downstream because whether a
 * deck has committed is not on this object and never should be — a card's
 * availability has no business knowing a deck's history beyond this one bit.
 */
export type DeckClaim = {
  id: string;
  name: string;
  quantity: number;
  mature: boolean;
  /**
   * This deck's draft differs from its newest version. A pull would sweep those
   * pending edits into a version its owner never asked for, so the server
   * refuses one (`pullCardFromDeck`) — and a control that can only fail must not
   * be drawn. Always false for a brew: there is no version to differ from.
   */
  pending: boolean;
  /**
   * The card is this deck's commander or partner. Commander claims are in the
   * model, so a pull would otherwise be offered on a row where no route can
   * release it — there is no "go and fix it there" either, which is why this
   * guard draws no control at all.
   */
  commander: boolean;
};

/** A deck holding a hard claim. The projection every marker string reads. */
export type HardDeck = { id: string; name: string };

/**
 * The mature claimants, in the order the query returned them. Derived rather
 * than stored: `claims` is the whole truth and a second stored field could
 * disagree with it.
 */
export function hardDecks(a: Pick<Availability, "claims">): HardDeck[] {
  return a.claims.filter((c) => c.mature).map(({ id, name }) => ({ id, name }));
}

export type Availability = {
  owned: number;
  hard: number;
  soft: number;
  /**
   * Copies not spoken for, FROM THE VANTAGE THIS WAS LOADED WITH. Negative when
   * finished decks want more copies than exist.
   *
   * Off-decklist (no `excludeDeckId`) this is `owned − hard`. On a deck's own
   * decklist it is `owned − ownClaim − seniorHard`, because Addendum 2 §6
   * excludes that deck from supply as well as claims, and seniority decides
   * which of two claimants goes short. The query computes it either way;
   * **never recompute it from `owned` and `hard`**, which is right only in the
   * first case and silently wrong in the second.
   *
   * `ownClaim` in that second form is the deck's DRAFT ask — its live
   * `deck_cards` plus its commanders — not the ask its committed version
   * states. A card the draft added therefore reads short when its only copy is
   * sleeved senior elsewhere, which is what `loadDeckBuyRows` has always
   * billed; a version-shaped figure made the two surfaces disagree.
   */
  free: number;
  /**
   * Every deck claiming this card — finished and brewing alike — minus the
   * excluded deck when one was passed, so this follows the same vantage rule as
   * `free`. Ordered by name, then by id; the id is the tiebreak, not decoration,
   * because names collide, and without it two decks sharing a name would order
   * arbitrarily — the receipt's rows and every `hardDecks(a)[0]` reader would
   * then reshuffle between two reads of unchanged data.
   *
   * The id rides along because two decks can share a name — `claim_decks` keys
   * on `deck_id` for exactly that reason — so a surface wanting to link the
   * named deck cannot recover it from the name alone.
   *
   * The mature quantities here sum to `hard` and the rest sum to `soft`; both
   * come out of the same CTE, so the receipt on card detail can account for
   * every copy without a second query and without arithmetic of its own.
   */
  claims: DeckClaim[];
};

export type AvailabilityState = "free" | "soft" | "hard" | "over";

/**
 * Total order, most severe first — the four states are a partition, so the
 * first match wins and every card lands in exactly one.
 *
 * `selfExcluded` is the deck's-own-decklist vantage (Addendum 2 §6). There,
 * `free` is computed against a supply that already has the current deck's
 * copies removed, so `free === 0` means "exactly enough for everyone,
 * including this deck" — silence, not a claim. A genuine conflict has
 * `free < 0` and presents as `over`.
 *
 * The hard state is therefore unreachable in this vantage — for ANY deck, not
 * only a finished one. Deck maturity is not an input here: it is already spent
 * upstream, deciding whether each claim counted as hard or soft. Addendum 2
 * words the consequence as "inside a finished deck", because that is the case
 * it draws, but the caller controls the vantage and nothing checks maturity at
 * this layer. Pass `selfExcluded` only when `free` came from a query given the
 * matching `excludeDeckId`; passing it against an unexcluded figure silently
 * converts every genuine hard claim into silence.
 *
 * The `owned <= 0` guard is tested against TRUE owned, never the excluded
 * supply, and it stays first: it keeps the marker off cards the player does not
 * own, which are reachable on the Add panel.
 */
export function availabilityState(
  a: Pick<Availability, "owned" | "free" | "soft">,
  opts?: { selfExcluded?: boolean },
): AvailabilityState {
  if (a.owned <= 0) return "free";
  if (a.free < 0) return "over";
  if (a.free === 0) return opts?.selfExcluded ? "free" : "hard";
  if (a.soft > 0) return "soft";
  return "free";
}
