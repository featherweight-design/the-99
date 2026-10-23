"use client";

// A combo opened from card details' combo block (combos close UI-3, README call 5, S15): the shipped
// combo body with UI-2's one-piece-away face (`ComboBody` `oneAway`), in a sheet over the card. The
// provider owns it, as it owns the Fits picker (OPEN-8): `ModalChrome` with `overCard` lifts the card
// into the held slot, kept mounted with its scroll and its block still open, and the sheet's close is
// the way back to it, `← {card}` at both widths. A card opened from the partner's plate stacks over
// the sheet (the provider's third layer) and names it `← {card} + {partner}` on its way back.

import { useEffect, useState } from "react";

import { addCardToDeck } from "../../app/decks/actions";
import { nearComboModal } from "../../lib/bracket/combo-modal";
import type { PrintingPrices } from "../../lib/cards/price-lookup";
import type { BrowseCard } from "../../lib/collection/browse";
import { printedNameOf, resolvedPrinting } from "../../lib/collection/browse";
import { holdingDecks } from "../../lib/combos/holding-decks";
import type { CardCombo, CardComboWhere } from "../../lib/combos/near-combos";
import { combosCloseCopy } from "../../lib/copy/combos-close";
import { DECK_ADD_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { priceOf, priceQualifier, priceState } from "../../lib/decks/price";
import { MissingPieceWhereLine } from "../decks/combo-where-line";
import { MutationError } from "../decks/mutation-error";
import { ComboBody, ModalChrome, type FindingArt } from "../decks/receipt-modal";
import { useDeckMutation } from "../decks/use-deck-mutation";
import { GhostButton } from "../ui/button";

const copy = combosCloseCopy;

/**
 * Pure: where the card the combo was opened FROM is (OPEN-10), from what the card already carries: in
 * the deck in scope; else a spare; else every copy in other decks; else its buy tag's figure. Null for
 * an owned card whose claims could not be read (`availability: null`): where its copies are is unknown,
 * and a buy tag beside a card the modal calls owned would be false.
 */
export function openedCardWhere(card: BrowseCard, inScope: boolean): CardComboWhere | null {
  if (inScope) return { kind: "inDeck" };
  const a = card.availability;
  if (!a && card.quantity > 0) return null;
  if (a && a.owned > 0) return a.free > 0 ? { kind: "spare" } : { kind: "elsewhere", decks: holdingDecks(a) };
  return { kind: "buy", ...cheapestLive(card.prices), soldOut: false };
}

/**
 * Pure: the card's cheapest LIVE figure, a non-foil one first and else a foil or etched one with its
 * qualifier, by the shared price rules (`priceState`, `priceOf`, `priceQualifier`), as the server's
 * read prices a partner (`cheapestNow`, `qualifierOf`). Nothing live: no figure.
 */
export function cheapestLive(prices: PrintingPrices | null | undefined): { cents: number | null; qualifier: string | null } {
  let plain: number | null = null;
  let finish: { cents: number; qualifier: string | null } | null = null;
  for (const fact of Object.values(prices?.byScryfallId ?? {})) {
    const state = priceState(fact, prices?.newestAsOf ?? null);
    const cents = priceOf(fact, state);
    if (cents === null) continue;
    if (state === "priced") {
      if (plain === null || cents < plain) plain = cents;
    } else if (finish === null || cents < finish.cents) {
      finish = { cents, qualifier: priceQualifier(fact, state) };
    }
  }
  if (plain !== null) return { cents: plain, qualifier: null };
  return finish ?? { cents: null, qualifier: null };
}

/**
 * Pure: whether the combo's foot offers `Add {partner}` (OPEN-11): on the deck's own page, for a line
 * of `One piece away · you hold the rest` (the card is in the deck, the partner is not). The read has
 * already kept only partners the deck could add there (`keptInDeckScope`). Anywhere else, the foot is
 * the Spellbook link alone.
 */
export function offersAdd(combo: CardCombo, inScope: boolean, deckId: string | null): boolean {
  const partner = combo.others[0];
  return deckId !== null && inScope && partner !== undefined && partner.state !== "inDeck";
}

export function CardComboSheet({
  card,
  combo,
  inScope,
  deckId,
  onClose,
  onAddLanded,
  onAddSettled,
}: {
  /** The card the combo was opened from, under the sheet. */
  card: BrowseCard;
  combo: CardCombo;
  /** The deck in scope lists the card (the block's split). */
  inScope: boolean;
  /** The deck page's deck, which Add adds to; null anywhere else. */
  deckId: string | null;
  onClose: () => void;
  /** Add wrote: the provider re-reads the card once it is live again, even if this sheet has gone. */
  onAddLanded: () => void;
  /** Add's redraw landed: the provider returns to the card unless a card is open over this sheet. */
  onAddSettled: () => void;
}) {
  const partner = combo.others[0];
  const name = printedNameOf(card);
  // The opened card first, then the partner: the line reads `with {partner}` (OPEN-10).
  const pieces = [{ oracleId: card.oracleId, name }, ...(partner ? [{ oracleId: partner.oracleId, name: partner.name }] : [])];
  const art: FindingArt = new Map([
    [card.oracleId, { name, imageUri: resolvedPrinting(card)?.imageUri ?? card.imageUri }],
    ...(partner ? [[partner.oracleId, { name: partner.name, imageUri: partner.imageUri }] as const] : []),
  ]);
  const title = copy.detail.name(pieces.map((p) => p.name));
  const back = copy.card.backAria(name);
  const add = partner && offersAdd(combo, inScope, deckId) ? partner : null;

  const { isPending, error, run } = useDeckMutation(false, DECK_ADD_FALLBACK_MESSAGE);
  // Back to the card only once the action's transition has settled, which for a revalidating action
  // is when the redrawn page (and the deck's new list) has landed: the card's block then reads again
  // against the list that holds the partner, and its line moves to `Whole in this deck`.
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (added && !isPending) onAddSettled();
  }, [added, isPending, onAddSettled]);

  return (
    <ModalChrome
      title={title}
      closeLabel={copy.card.closeAria}
      onClose={onClose}
      width={760}
      // `.bk2`, as the combo pushed inside the deck's list draws it: `← {card}` and the close, the
      // title spoken only (the body's own heading names the combo).
      back={{ label: name, aria: back, onBack: onClose }}
      // Lifts the card into the held slot under the sheet (its header is `back`'s, which wins).
      overCard={{ name, backAria: back }}
    >
      <div data-card-combo={combo.variantId}>
        <ComboBody
          combo={nearComboModal({ ...combo, pieces })}
          art={art}
          oneAway={{
            platesInert: isPending,
            // Outlined only where the deck lacks it: a whole combo has no missing piece.
            missingOracleId: inScope && partner && partner.state !== "inDeck" ? partner.oracleId : undefined,
            stillOracleId: card.oracleId,
            where: (oracleId) => {
              const where = oracleId === card.oracleId ? openedCardWhere(card, inScope) : (partner?.where ?? { kind: "spare" });
              return where ? <MissingPieceWhereLine where={where} on="plate" /> : null;
            },
            action: add ? (
              <>
                <GhostButton
                  onClick={() =>
                    run(async () => {
                      const outcome = await addCardToDeck(deckId!, add.oracleId);
                      if (!outcome || outcome.ok) {
                        onAddLanded();
                        setAdded(true);
                      }
                      return outcome;
                    })
                  }
                  disabled={isPending || added}
                  className="h-[44px] md:h-[36px] min-h-0 md:min-h-0 rounded-[9px] px-[18px] text-[13.5px] font-semibold disabled:opacity-50"
                >
                  {copy.detail.add(add.name)}
                </GhostButton>
                {error ? <MutationError message={error} /> : null}
              </>
            ) : null,
          }}
        />
      </div>
    </ModalChrome>
  );
}
