// The three standing bracket facts, assembled for a surface to draw.
//
// PURE and client-safe: it takes the flags rather than reading them, so the deck loader,
// the browse loader and the card-detail loader each fetch once for their whole page and
// share one assembly. Two copies of this logic is how the fixed order drifts.

import type { CardFact } from "../copy/card-mark";
import type { CardBracketFlags } from "./flags-read";

/**
 * `undefined` when the card carries nothing, never `[]`.
 *
 * The empty array is the expensive answer on every surface this feeds — `/collection` is the
 * largest payload in the app and most cards carry no fact — and it is also the wrong one:
 * absent already means "no fact" in `card_bracket_flags`, so an empty list would invent a
 * second way of saying it. Neither form is a claim that a card is CLEAR; detection on two of
 * the three is measured and partial.
 *
 * The order is fixed — gameChanger, massLandDenial, extraTurns — and it is the order the key
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
  return facts.length > 0 ? facts : undefined;
}
