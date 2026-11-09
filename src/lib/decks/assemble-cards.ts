import type { CandidateFacts } from "../bracket/delta";
import type { Availability } from "../cards/availability";
import { withChainArt } from "../cards/chain-art";
import { comboFor, deckComboFields } from "../combos/attach";
import type { ComboPartner } from "../combos/near-miss";
import { priceFor, type PriceRead } from "./price-query";
import type { DeckDetail } from "./read";
import type { TopOffCandidate, TopOffCandidateWithFacts } from "./last-slots";

/**
 * One card with its price attached, on the deck's rule: the deck's held pick when it is in stock, else today's figure
 * (`priceFor`), and `null` for every card when the price read failed. The page prices its suggestions through this too,
 * so the deck's rows and the Add panel's tiles cannot price the same card two ways.
 */
export function priceRow<T extends { oracleId: string }>(card: T, priced: PriceRead | null, deckId: string) {
  return {
    ...card,
    price: priced ? priceFor(priced, deckId, card.oracleId) : null,
  };
}

/**
 * The deck's rows and commanders as `/decks/[id]` hands them to the builder: each one carrying its price and its
 * in-deck combo fields, attached here, server-side, so no component below does a map lookup during render and
 * `BuilderShell` takes one extra scalar rather than a collection across the boundary.
 *
 * Taken out of the page so the landing demo's exporter (PR 6b) can assemble the same rows from data it loads itself.
 * It takes only what is already loaded: no request, no session, no switch, no read.
 *
 * - `priced` null (the price read failed) prices every row `null`, the same as a card with no figure.
 * - `inDeckCombos` null (the combo read failed) marks no row (`comboPartner: null`).
 * - The commanders carry a price for the reason the rows do: the Shopping list draws an unowned or spoken-for commander
 *   in its own group, priced like the rows below it.
 */
export function assembleDeckCards(args: {
  deckId: string;
  detail: Pick<DeckDetail, "cards" | "commander" | "partner">;
  priced: PriceRead | null;
  inDeckCombos: ReadonlyMap<string, ComboPartner> | null;
}) {
  const { deckId, detail, priced, inDeckCombos } = args;
  const withPrice = <T extends { oracleId: string }>(card: T) => priceRow(card, priced, deckId);
  const cards = detail.cards.map(withPrice).map((c) => ({ ...c, ...deckComboFields(c.oracleId, inDeckCombos) }));
  const commander = { ...withPrice(detail.commander), ...deckComboFields(detail.commander.oracleId, inDeckCombos) };
  const partner = detail.partner
    ? { ...withPrice(detail.partner), ...deckComboFields(detail.partner.oracleId, inDeckCombos) }
    : null;
  return { cards, commander, partner };
}

/**
 * Top off's candidates as `/decks/[id]` hands them to the builder, in rank order: each drawn with the art card details
 * opens for it (`withChainArt`), priced only when unowned (only an unowned row draws a BuyTag), with availability only
 * when owned (an unowned id is never in the collection's read), and carrying its card-note facts and the combo it
 * completes in this deck, so the row reads fields rather than doing a map lookup per render. Every read failed is `null`
 * (no figure, no marker, no note, no combo), the same as a card that carries nothing.
 *
 * Shared with the landing demo's exporter (`src/lib/demo/project-decks.ts`) for the reason `assembleDeckCards` is.
 */
export function assembleTopOffCandidates(args: {
  candidateCards: readonly TopOffCandidate[];
  ownedArt: ReadonlyMap<string, string>;
  priced: PriceRead | null;
  availability: ReadonlyMap<string, Availability> | null;
  candidateFacts: ReadonlyMap<string, CandidateFacts> | null;
  completions: ReadonlyMap<string, ComboPartner> | null;
}): TopOffCandidateWithFacts[] {
  const { priced, availability, candidateFacts, completions } = args;
  return withChainArt(args.candidateCards, args.ownedArt).map((c) => ({
    ...c,
    price: c.owned ? null : (priced?.prices.get(c.oracleId) ?? null),
    availability: c.owned ? (availability?.get(c.oracleId) ?? null) : null,
    facts: candidateFacts?.get(c.oracleId) ?? null,
    comboPartner: comboFor(c.oracleId, completions),
  }));
}
