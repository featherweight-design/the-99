"use client";

// The spent slot in card view — #185's receipt, transposed into a tile.
//
// `UndoRow` in `decklist-row.tsx` is the same component for the row shell, and
// the rules it settled all hold here: undo is a re-add rather than a rollback,
// it is the one builder mutation with no optimistic prediction (an optimistic
// re-add would unmount the receipt mid-flight and leave a refusal nowhere to
// be said), and the control disappears once the undo has been refused, because
// the message below it says where to go instead.
//
// It borrows `TILE_SHELL` and `TILE_ART_RATIO` from the live tile rather than
// restating them, so a removed card leaves a hole exactly its own size and the
// grid does not reflow around the receipt.

import { printedFaceName } from "../../lib/collection/browse";
import { addCardToDeck } from "../../app/decks/actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { MutationError } from "./mutation-error";
import { CARD_TILE_CAPTION_H } from "../ui/card-tile-caption";
import { TILE_ART_RATIO, TILE_SHELL } from "./deck-card-tile";
import { useAnnounceUndo } from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";

export function UndoTile({ deckId, card }: { deckId: string; card: DeckDetailCard }) {
  const { isPending, error, run } = useDeckMutation(false, addPanelCopy.undo.failed);
  const announceUndo = useAnnounceUndo();

  function handleUndo() {
    announceUndo(card);
    // `relock` (Locked L1, D2): the card comes back locked if it left locked.
    run(() => addCardToDeck(deckId, card.oracleId, { relock: true }));
  }

  return (
    <li className="flex flex-col">
      <div
        className={`${TILE_SHELL} bg-surface-sunken border border-dashed border-border-strong`}
      >
        {/* The art's box, empty and holding the shape. The removal sentence sits
            in it rather than under it: on a tile the art is most of the height,
            so a receipt that only wrote in the caption would be a card-shaped
            blank with a line of small print beneath it. */}
        <div
          className="flex items-center justify-center px-[10px] text-center"
          style={{ aspectRatio: TILE_ART_RATIO }}
        >
          <span className="font-mono text-[11px] leading-[1.4] text-fg-locked">
            {addPanelCopy.undo.removed(printedFaceName(card))}
          </span>
        </div>
        {/* Same caption slot as the live tile, so the Undo lands where the ✕ it
            answers for was. */}
        {/* The caption's height comes from the live tile's own constant, never
            restated here: the receipt exists to leave a hole exactly the size of
            the card it replaced, and a second copy of the figure breaks that
            invariant the first time the caption moves — silently, because both
            tiles still render. */}
        <div className={`flex items-center justify-center ${CARD_TILE_CAPTION_H} px-[9px] md:px-[11px]`}>
          {!error && (
            <button
              type="button"
              onClick={handleUndo}
              disabled={isPending}
              className="flex items-center h-[44px] px-[12px] md:h-auto md:px-0
                bg-transparent border-0 md:border-b md:border-accent-shadow
                text-[13px] md:text-[12.5px] font-semibold md:leading-[1.4]
                text-accent md:hover:text-accent-hover cursor-pointer disabled:opacity-50 disabled:cursor-default"
              aria-label={addPanelCopy.undo.actionAria(printedFaceName(card))}
            >
              {addPanelCopy.undo.action}
            </button>
          )}
        </div>
      </div>
      {error && <MutationError message={error} />}
    </li>
  );
}
