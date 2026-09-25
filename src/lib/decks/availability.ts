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
  /**
   * The deck has LOCKED this card (Locked, L2): Pull it never takes it, and the server refuses a
   * forced one. Always false while `NEVER_CUT_ENABLED` is off. Optional because the query always
   * carries it while a hand-built claim (every fixture, the About specimens) need not: absent is
   * unlocked, which is how every claim read before the feature existed.
   */
  locked?: boolean;
  /**
   * When this card entered this deck's committed version, as EPOCH MILLIS.
   *
   * Millis rather than the timestamp's own rendering: the column is `timestamp`
   * without time zone, so `jsonb_build_object` emits `2026-08-02T12:00:00` with no
   * zone and `new Date()` reads that as LOCAL time. This repository has shipped
   * that bug once already.
   *
   * Null for a brew, which has no version and therefore no seniority — the same
   * null the ordering reads as "junior to everything committed".
   *
   * Optional on the type, always emitted by the query. Nineteen test files build
   * `DeckClaim` literals and none of them care about seniority ordering; making it
   * required would be a mechanical edit to all nineteen for nothing.
   */
  since?: number | null;
  /**
   * The number of the version this claim comes from — the `v7` of a `v7 · 2 Aug`
   * stamp. Null for a brew, and optional for the same reason as `since`.
   */
  versionNumber?: number | null;
  /**
   * How many of `quantity` this deck holds as its commander or partner.
   *
   * `commander` above is this being greater than zero, and stays because that is
   * what every current reader wants. This exists because the two are NOT the same
   * question once a copy can be given away: a deck holding the card as its
   * commander AND on its own list folds into one claim of quantity 2, of which only
   * the list copy may be reserved. A boolean can only make that row wholly inert,
   * which hides a legal choice.
   */
  commanderCopies?: number;
  /**
   * Copies of this card RESERVED to this deck, as the claim model granted them — already capped
   * at the deck's own list ask and at the supply left when its turn came.
   *
   * Carried rather than recomputed downstream for the reason the model's own header gives: the
   * reservation arithmetic has one implementation, and a reader re-deriving it becomes a second
   * source of truth that drifts one round at a time. Zero when the player has reserved nothing.
   */
  granted?: number;
  /**
   * `free` counts this claim, so releasing it could relieve the vantage deck's
   * shortfall. False for a sleeved deck that is JUNIOR to the vantage on this
   * card: seniority already leaves a junior claim out of `free`, so taking its
   * copy away moves no figure and costs that deck its slot for nothing.
   *
   * RESERVATIONS DO NOT ENTER THIS FLAG. A deck displaced by another deck's
   * reservation is not offered a pull, and that is deliberate: its route back is to
   * change the pick, which is reversible and cuts no version, where a pull cuts one.
   * An exception here was tried and removed — it is wrong for a partial reservation,
   * since pulling one copy from a deck asking for two still leaves its reservation
   * granting one and moves no figure at all.
   *
   * True for every sleeved claim when there is no vantage deck, and when the
   * vantage has not sleeved this card — both cases where `free` subtracts the
   * lot.
   *
   * It gates the PULL only. A marker still names every hard claimant, because
   * "this card is in Prismari Artistry" is true whoever is senior.
   */
  senior: boolean;
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

/**
 * The hard claimants a pull could take a copy from and move the figure.
 *
 * `hardDecks` answers "who has it" and is what every marker string reads.
 * This answers "who could give it up to us", which is a narrower question with
 * one extra term: a junior claim is not counted against this deck's `free`, so
 * releasing it leaves the shortfall exactly where it was. Every surface that
 * buckets an add or authorizes a pull reads this one; the markers do not.
 */
export function pullSources(a: Pick<Availability, "claims">): HardDeck[] {
  return a.claims.filter((c) => c.mature && c.senior).map(({ id, name }) => ({ id, name }));
}

export type Availability = {
  owned: number;
  hard: number;
  soft: number;
  /**
   * Copies not spoken for, FROM THE VANTAGE THIS WAS LOADED WITH. Negative when
   * committed decks want more copies than exist.
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
   * Every deck claiming this card — committed and draft alike — minus the
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

/**
 * Stamp a list of cards with the claim picture `loadAvailability` returned for each.
 *
 * Generic over the card for the same reason `withCommitted` is: a role card and a
 * synergy card share nothing but an oracle id, and the stamp means the same on both.
 *
 * **An absent entry becomes `null`, which means NO ROW and never "unowned."** See
 * `RoleCard.availability` for why the difference is load-bearing.
 */
export function withAvailability<T extends { oracleId: string }>(
  cards: T[],
  byCard: Map<string, Availability>,
): (T & { availability: Availability | null })[] {
  return cards.map((card) => ({ ...card, availability: byCard.get(card.oracleId) ?? null }));
}

/**
 * Whether this card draws an availability MARKER.
 *
 * One definition, because the question is asked in three places — the chip, the
 * synergy slot, and the dot key that has to know whether either of them is
 * saying anything — and three copies of it drift a round at a time.
 *
 * Two ways to draw nothing. A free card has nothing to report, which is the
 * feature. And an UNOWNED card draws a buy tag instead: the slot is one column
 * with two occupants, so a card you do not own is never also carrying a marker.
 * `owned` is optional because Role Coverage is built from the owned pool and its
 * cards do not carry the field; absent means owned.
 *
 * A null `availability` is NO ROW — an unowned card, a basic, or a read that
 * could not reach — and reads as free here, which is right: nothing to report.
 */
export function drawsMarker<T extends { owned?: boolean; availability: Availability | null }>(
  card: T,
): card is T & { availability: Availability } {
  if (card.owned === false) return false;
  if (card.availability === null) return false;
  return availabilityState(card.availability) !== "free";
}

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
 * only a committed one. Deck maturity is not an input here: it is already spent
 * upstream, deciding whether each claim counted as hard or soft. Addendum 2
 * words the consequence as "inside a committed deck", because that is the case
 * it draws, but the caller controls the vantage and nothing checks maturity at
 * this layer. Pass `selfExcluded` only when `free` came from a query given the
 * matching `excludeDeckId`; passing it against an unexcluded figure silently
 * converts every genuine hard claim into silence.
 *
 * The soft state survives that vantage. `free === 0` self-excluded is the same
 * comfortable reading `free > 0` is off-decklist — the collection covers every
 * claim, this deck's included — so a soft claim on the copy is still the most
 * severe thing true about it, and returning silence before reading `soft` hid a
 * state the design draws. It is reached only where `soft > 0`, so a card no
 * draft wants is silent exactly as before.
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
  if (a.free === 0 && !opts?.selfExcluded) return "hard";
  if (a.soft > 0) return "soft";
  return "free";
}
