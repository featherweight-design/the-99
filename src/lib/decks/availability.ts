/**
 * A deck at 99 cards is finished enough that its cards are physically sleeved,
 * so its claims are hard. Below 99 it is a brew and its claims are soft. This
 * is the brief's proxy for deck maturity and it reuses statusPill()'s own
 * threshold — Playable/Complete sit at 99, Draft/Building below it.
 */
export const MATURE_DECK_SIZE = 99;

export type Availability = {
  owned: number;
  hard: number;
  soft: number;
  /**
   * Copies not spoken for, FROM THE VANTAGE THIS WAS LOADED WITH. Negative when
   * finished decks want more copies than exist.
   *
   * Off-decklist (no `excludeDeckId`) this is `owned − hard`. On a deck's own
   * decklist it is `(owned − ownClaim) − (hard − ownHardClaim)`, because
   * Addendum 2 §6 excludes that deck from supply as well as claims. The query
   * computes it either way; **never recompute it from `owned` and `hard`**,
   * which is right only in the first case and silently wrong in the second.
   */
  free: number;
  /**
   * The mature decks holding a hard claim, minus the excluded deck when one was
   * passed. Ordered by name.
   *
   * The id rides along because two decks can share a name — `claim_decks` keys
   * on `deck_id` for exactly that reason — so a surface wanting to link the
   * named deck cannot recover it from the name alone.
   */
  hardDecks: { id: string; name: string }[];
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
