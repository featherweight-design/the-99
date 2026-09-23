// The three standing bracket facts, assembled for a surface to draw.
//
// PURE and client-safe: it takes the flags rather than reading them, so the deck loader,
// the browse loader and the card-detail loader each fetch once for their whole page and
// share one assembly. Two copies of this logic is how the fixed order drifts.

import type { CardFact } from "../copy/card-mark";
import type { CardBracketFlags } from "./flags-read";
import type { CardNoteFacts } from "./card-note";

/**
 * `undefined` when the card carries nothing, never `[]`.
 *
 * The empty array is the expensive answer on every surface this feeds — `/collection` is the
 * largest payload in the app and most cards carry no fact — and it is also the wrong one:
 * absent already means "no fact" in `card_bracket_flags`, so an empty list would invent a
 * second way of saying it. Neither form is a claim that a card is CLEAR; detection on two of
 * the three is measured and partial.
 *
 * The order is fixed — gameChanger, massLandDenial, extraTurns, tutor — and it is the order the key
 * lists and every surface draws.
 */
export function factsFor(
  gameChanger: boolean,
  flags: CardBracketFlags | undefined,
): CardFact[] | undefined {
  const facts: CardFact[] = [];
  if (gameChanger) facts.push("gameChanger");
  if (flags?.massLandDenial) facts.push("massLandDenial");
  if (flags?.extraTurn) facts.push("extraTurns");
  // LAST among the facts. The lemniscate is not a `CardFact` — combo awareness draws it, and
  // every surface and every key draws it AFTER the facts — so the order a reader meets is
  // bolt, peak, turn again, drawn up, then the lemniscate where a card has one.
  if (flags?.tutor) facts.push("tutor");
  return facts.length > 0 ? facts : undefined;
}

/**
 * The same marks, for a CANDIDATE the player is deciding whether to add.
 *
 * `CandidateFacts` carries the flag-derived facts as plain booleans — it comes off a
 * different read from the deck's own cards, one scoped to a pool rather than to a list — so
 * this is the adapter, and it is an adapter rather than a second assembly on purpose. The
 * fixed order and the `undefined`-not-`[]` rule are `factsFor`'s, stated once.
 *
 * The tutor is here now that `TutorGlyph` exists (#863) and the flag is stored. A candidate's
 * `tutor` comes from `isTutor`, the same predicate the ingest stores, so a candidate's mark and
 * the same card's mark in the collection agree.
 */
export function factsFromCandidate(facts: CardNoteFacts | null): CardFact[] | undefined {
  if (!facts) return undefined;
  return factsFor(facts.gameChanger, {
    massLandDenial: facts.massLandDenial,
    massLandDenialSources: [],
    extraTurn: facts.extraTurn,
    extraTurnSources: [],
    tutor: facts.tutor,
  });
}
