"use client";

/**
 * I got it's second way in (plan PR 4, handoff A4 and A11): card details opened from a Shopping row
 * draw `Bought this card?` on the `In your collection` receipt's label line, in the slot Edit copies
 * takes on /collection, and it opens the same confirm the row's tag does. Never from /collection, a
 * deck's All tab or search: the modal draws it only for a card a Shopping row opened (`door`), and
 * only this deck page registers it.
 *
 * The confirm stacks over the card (stacked sheets): the card is held under it, inert, and comes back
 * when it closes, re-read after a write so its receipt reads the copy in (`none` to `×1`).
 */
import { useEffect } from "react";

import { printedNameOf } from "../../lib/collection/browse";
import { gotItCopy } from "../../lib/copy/i-got-it";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { deckRowTag } from "../../lib/decks/row-tag";
import { isSpokenFor } from "../../lib/decks/shopping";
import { RECEIPT_LINK_CLASS } from "../cards/card-modal";
import { useCardDetail } from "../cards/card-detail-provider";
import { useGotIt } from "./got-it";

const LINK = "got-it-details-link";

/** A row whose tag is the I got it button: the same test the row makes (`pressable`). */
function buysFrom(card: DeckDetailCard): boolean {
  return deckRowTag(card, isSpokenFor(card)) === "buy";
}

/**
 * Back from the confirm, focus lands on the link. The confirm's own focus return cannot do it: the
 * link it was pressed in went with the card that was lifted, and the one drawn now is inert until the
 * card comes back, a render after the confirm goes. A card the purchase took off the list draws no
 * link, so focus lands on the card dialog's first visible control instead.
 */
function landOnLink() {
  let tries = 0;
  const land = () => {
    const live = (el: Element | null): el is HTMLElement => el instanceof HTMLElement && el.closest("[inert]") === null;
    const link = document.querySelector(`[data-testid="${LINK}"]`);
    if (live(link)) return link.focus();
    if (tries++ < 10) return void requestAnimationFrame(land);
    // The dialog itself takes no focus (no tabIndex), so land on its first control a reader can see:
    // the phone and desktop each draw their own close, one of them hidden by CSS.
    const dialog = [...document.querySelectorAll("[role=dialog]")].find(live);
    const controls = dialog ? [...dialog.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])")].filter(live) : [];
    (controls.find((el) => el.getClientRects().length > 0) ?? controls[0])?.focus();
  };
  requestAnimationFrame(land);
}

function GotItDetailsLink({ card, newestAsOf }: { card: DeckDetailCard; newestAsOf: Date | null }) {
  const gotIt = useGotIt();
  const { registerSheet, evict } = useCardDetail();
  if (!gotIt) return null;
  // While an undo for this card is in flight a second write would go stale (A9), as on the tag.
  const disabled = gotIt.undoing.has(card.oracleId);
  return (
    <button
      type="button"
      data-testid={LINK}
      disabled={disabled}
      className={`${RECEIPT_LINK_CLASS} disabled:cursor-default disabled:opacity-45`}
      onClick={(e) => {
        const id = card.oracleId;
        const withdraw = registerSheet(undefined, undefined, true);
        gotIt.open(card, printedNameOf(card), newestAsOf, e.currentTarget, {
          onClose: (wrote) => {
            withdraw();
            // After the write, by construction: the card's own read is from before it.
            if (wrote) evict(id);
            landOnLink();
          },
        });
      }}
    >
      {gotItCopy.row.detailsLink}
    </button>
  );
}

/**
 * Hands the deck page's card modal I got it's link, for a card a Shopping row opened whose tag is the
 * button: body rows and commander rows alike, as the tag is. Mounted only with I got it on.
 */
export function GotItDoorRegistration({ shoppingCards, newestAsOf }: { shoppingCards: DeckDetailCard[]; newestAsOf: Date | null }) {
  const { registerReceiptLink } = useCardDetail();
  // Re-registered whenever the rows are read again, not only when which cards are buyable moves: a
  // partial purchase leaves the card buyable with a smaller need, and the provider renders the link
  // during its own render, so a renderer holding the previous rows would preset the old need.
  // The decklist memoizes `shoppingCards`, so this runs once per read of the list.
  useEffect(
    () =>
      registerReceiptLink((oracleId) => {
        const card = shoppingCards.find((c) => c.oracleId === oracleId);
        return card && buysFrom(card) ? <GotItDetailsLink card={card} newestAsOf={newestAsOf} /> : null;
      }),
    [registerReceiptLink, shoppingCards, newestAsOf],
  );
  return null;
}
