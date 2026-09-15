"use client";

// The card view's unit (#349) — Matrix 2 of STATES-card-surfaces.md.
//
// Built from `collection/grid-view.tsx`'s tile, with four deltas: the ownership
// dot and the cost pips share the art's bottom-left scrim, the set/rarity
// caption is gone, the quantity badge disappears at one copy, and the `✕` joins
// the caption. It is not a fork of `suggestion-tile.tsx` — that one carries
// evidence bars, an Add button and a two-line clamped name it needs to keep a
// shelf of tiles in alignment, none of which a decklist tile has any use for.
//
// Three of the four corners are marked and the fourth is left bare on purpose:
// four marked corners is a frame, and an empty bottom-right keeps the art
// reading as one click target.

import { removeCardFromDeck } from "../../app/decks/actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { cardTileCopy } from "../../lib/copy/card-surfaces";
import { cssUrl, printedFaceName, printedNameOf } from "../../lib/collection/browse";
import { availabilityState } from "../../lib/decks/availability";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { AvailabilityMarker } from "../ui/availability-marker";
import { CostPips } from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { BuyTag } from "./buy-tag";
import { CardDetailTrigger, cardDetailCopy } from "../cards/card-detail-provider";
import { TwoFacedMark } from "../cards/two-faced-mark";
import { MutationError } from "./mutation-error";
import { UndoTile } from "./deck-card-undo-tile";
import {
  useMarkSlotSpent,
  useRemoveOptimisticCard,
  useReportRemoveFailure,
} from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";
import { ProxyTag } from "./proxy-tag";
import { deckRowTag } from "../../lib/decks/row-tag";

/** Radius, plate and art shape — everything the undo tile shares with the live
 *  one, so a removed card leaves a hole exactly its own size. */
export const TILE_SHELL =
  "group flex flex-col overflow-hidden rounded-[9px] md:rounded-[10px]";
export const TILE_ART_RATIO = "63 / 88";

export function DeckCardTile({
  deckId,
  card,
  siblings,
  spent = false,
}: {
  deckId: string;
  card: DeckDetailCard;
  /** The decklist in display order, so the modal's Prev/Next page through it. */
  siblings?: string[];
  /** See DecklistRow — the decklist owns this, not the tile. */
  spent?: boolean;
}) {
  const { isPending, error, run } = useDeckMutation(false, DECK_REMOVE_FALLBACK_MESSAGE);
  const removeOptimisticCard = useRemoveOptimisticCard();
  const markSlotSpent = useMarkSlotSpent();
  const reportRemoveFailure = useReportRemoveFailure();
  const shellReportsFailure = reportRemoveFailure !== null && card.quantity <= 1;

  // `selfExcluded` unconditionally, for the row's reason: every card here is
  // claimed by this deck, and the figures came from a query given its id.
  const availState = card.availability
    ? availabilityState(card.availability, { selfExcluded: true })
    : "free";
  // Two strings, because they answer different questions. The caption is a
  // front face and may clip; the trigger's accessible name is whole and never
  // does. The modal — one tap away on the art — is the recovery path.
  const displayName = printedFaceName(card);
  const fullName = printedNameOf(card);

  function handleRemove() {
    markSlotSpent(card);
    run(
      async () => {
        try {
          await removeCardFromDeck(deckId, card.oracleId);
        } catch (cause) {
          if (shellReportsFailure) reportRemoveFailure(card.name);
          throw cause;
        }
      },
      () => removeOptimisticCard(card),
    );
  }

  if (spent) return <UndoTile deckId={deckId} card={card} />;

  return (
    <li className="flex flex-col">
      <div
        className={`${TILE_SHELL} bg-[color:var(--surface)] ${
          availState === "over"
            ? "[border:1px_solid_var(--avail-over-border)]"
            : "[border:1px_solid_var(--border)] md:hover:[border:1px_solid_var(--border-strong)]"
        }`}
      >
        <div className="relative">
          {/* Top-left is the availability slot, and on a card the player does
              not own it is never empty. The marker only speaks about copies you
              own, so unowned takes the collapsed `$` instead — with no price:
              here the chip is the floor, not the shop. */}
          {/* THE SAME EXCLUSIVE DECISION THE LIST ROW MAKES. Read off
              `card.owned` alone, this tile drew a buy tag on a printed card —
              the Card view telling the player to buy something the List view
              says they are printing, on one deck, one card, one glance apart. */}
          {deckRowTag(card) === "proxy" ? (
            <span className="absolute z-10 top-[6px] left-[6px] pointer-events-none">
              <ProxyTag variant="band" />
            </span>
          ) : card.owned ? (
            card.availability && (
              <AvailabilityMarker
                availability={card.availability}
                density="chip"
                selfExcluded
                // Nothing wraps the chip — the art trigger is its sibling, not
                // its parent — so it carries §17's prose itself.
                spoken
                className="z-10 pointer-events-none"
              />
            )
          ) : (
            <BuyTag
              variant="tile"
              corner="left"
              density="collapsed"
              label={cardTileCopy.slotUnownedAria}
            />
          )}

          {/* Top-right, and absent at one copy — the delta from `grid-view`,
              which draws `×1` on a collection where one copy is the common
              case and the badge is the tile's only count. */}
          {card.quantity > 1 && (
            <span
              aria-hidden
              className="absolute z-10 pointer-events-none font-mono font-semibold text-[11px] md:text-[12px] rounded-md top-[6px] md:top-[8px] right-[6px] md:right-[8px] px-[6px] md:px-[7px] py-[2px]"
              style={{ background: "var(--accent)", color: "var(--bg)" }}
            >
              {addPanelCopy.row.quantity(card.quantity)}
            </span>
          )}

          <CardDetailTrigger
            oracleId={card.oracleId}
            name={fullName}
            siblings={siblings}
            // `undefined` below one copy on purpose: that is what makes the
            // provider compose the label from `name`, which carries the full
            // printed name. The single-copy tile is the common case, and a
            // ternary fixed on one arm alone would leave it on the oracle name.
            ariaLabel={
              card.quantity > 1
                ? `${cardDetailCopy.triggerAria(fullName)}, ${cardTileCopy.copiesAria(card.quantity)}`
                : undefined
            }
            className="block w-full shadow-[inset_0_-40px_40px_-30px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(0,0,0,0.25)] md:shadow-[inset_0_-50px_50px_-34px_rgba(0,0,0,0.6),inset_0_0_0_1px_rgba(0,0,0,0.25)]"
            style={{
              aspectRatio: TILE_ART_RATIO,
              // A card with no art draws a plate rather than a colour-identity
              // gradient: the decklist read carries no colour identity, and a
              // gradient guessed from nothing would be a claim about the card.
              background: card.imageUri
                ? `center / cover no-repeat ${cssUrl(card.imageUri)}`
                : "var(--surface-sunken)",
            }}
          >
            {card.imageUri ? null : (
              <span
                className="flex h-full items-center justify-center text-center font-mono text-[9px] leading-[1.4]"
                style={{ color: "var(--fg-locked)" }}
              >
                {addPanelCopy.tile.noArt}
              </span>
            )}
          </CardDetailTrigger>

          {/* Bottom-left, outside the trigger: `CardDetailTrigger` carries its
              own accessible name, which replaces everything nested under it, so
              a cost spoken in there would be spoken nowhere. */}
          <span className="absolute left-[6px] bottom-[6px] z-10 pointer-events-none flex items-center gap-[5px]">
            <OwnershipDot
              owned={card.owned}
              committed={availState === "hard" || availState === "over"}
              className="w-[8px] h-[8px]"
              label={card.owned ? "Owned" : "Not owned"}
            />
            {card.manaCost ? (
              // No pre-parse: `CostPips` draws nothing for a cost with no
              // symbols in it, so a second parse here would only ask the same
              // question twice per tile.
              <CostPips cost={card.manaCost} size={11} className="flex gap-[3px]" spoken />
            ) : null}
          </span>
        </div>

        {/* Caption — the name and the only route out of the deck in this view. */}
        <div className="flex items-center gap-[4px] min-h-[44px] md:min-h-[36px] pl-[9px] pr-[2px] md:pl-[11px] md:pr-[3px]">
          {/* The printed front face, single line and never clamped: two lines
              would make caption height depend on the data, and a grid whose
              tiles are sometimes one line and sometimes two is either ragged or
              padded to the worst case on every tile.

              The `title` is gone and NOTHING replaces it on this element. An
              `aria-label` on a plain `<span>` is exposed to nothing — it would
              pass a testing-library query and reach no screen reader. The full
              name's home is the trigger above, which is a real `<button>` and
              is the tile's largest target. */}
          <span
            className="flex-auto min-w-0 truncate text-[12px] md:text-[13px] font-semibold"
            style={{ color: "var(--fg)" }}
          >
            {displayName}
          </span>
          {/* `ml-[2px]` on top of the caption's 4px gap: the mark's gap is 6px
              at both surfaces, and the caption's own rhythm is the ✕'s. */}
          <TwoFacedMark layout={card.layout} className="ml-[2px]" />
          {/* 32px on desktop rather than `grid-view`'s 24: this is the only way
              to remove a card in card view, so it takes the floor rather than
              the shortcut exception. Revealed on tile hover, which is a desktop
              idea — the phone keeps it drawn. */}
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="flex-none flex items-center justify-center w-[44px] h-[44px] md:w-[32px] md:h-[32px]
              rounded-[6px] bg-transparent border-none text-[13px] leading-none text-[color:var(--border-dashed)]
              md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100
              md:group-hover:text-[color:var(--fg-body)]
              active:bg-[color:var(--elevated)] active:text-[color:var(--fg-body)] md:active:bg-transparent
              cursor-pointer disabled:opacity-50 disabled:cursor-default"
            aria-label={
              card.quantity > 1
                ? addPanelCopy.row.removeCopyAria(card.name, card.quantity)
                : addPanelCopy.row.removeAria(card.name)
            }
          >
            {addPanelCopy.row.remove}
          </button>
        </div>
      </div>
      {error && !shellReportsFailure && <MutationError message={error} />}
    </li>
  );
}
