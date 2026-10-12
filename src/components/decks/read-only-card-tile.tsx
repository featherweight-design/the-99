"use client";

// The read-only form of `DeckCardTile` (precons R4 §6, design table §G: the open precon in Card view).
// A separate component rather than a prop on the deck's tile, because that tile's hooks assume a deck:
// it removes, locks, reads the draft and reports failures, and none of that has a deck to act on here
// (audit finding 4). What it shares is the anatomy: `TILE_SHELL`, the 63:88 art box with its bottom
// corners clipped, and `CardTileCaption` with a sub-line.
//
// It draws only what the read-only list row draws: the ownership dot (and `not owned` beside an
// unowned one, since there is no buy tag to say it), the name, and the precon's printing. No `✕`
// column, buy tag, availability chip, proxy mark, lock, draft edge, dimming or verdict. Card details
// open on press, on the printing the provider was given, and the desktop hover preview is kept.

import { printedFaceName, printedNameOf } from "../../lib/collection/browse";
import { preconsCopy } from "../../lib/copy/precons";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { CardDetailTrigger, cardDetailCopy, type Sibling } from "../cards/card-detail-provider";
import { CardTileCaption, TILE_ART_CLIP } from "../ui/card-tile-caption";
import { HydratedImg } from "../ui/hydrated-art";
import { OwnershipDot } from "../ui/ownership-dot";
import { TILE_ART_RATIO, TILE_SHELL } from "./deck-card-tile";
import { usePreviewRow } from "./hover-preview";

const copy = preconsCopy;

export function ReadOnlyCardTile({
  card,
  siblings,
  basic,
}: {
  card: DeckDetailCard;
  siblings?: readonly Sibling[];
  /** A basic land, drawn as one dashed tile per name at the foot of Lands: in Lands' figure, never in
   *  what you own, so no dot. `arts` is how many printings of it the precon holds. */
  basic?: { arts: number };
}) {
  const preview = usePreviewRow(card.imageUri);
  const printing =
    card.printedSetCode && card.printedCollectorNumber
      ? `${card.printedSetCode.toUpperCase()} ${card.printedCollectorNumber}`
      : null;
  const sub = basic && basic.arts > 1 && card.printedSetCode
    ? copy.open.basicArts(card.printedSetCode.toUpperCase(), basic.arts)
    : printing;
  const fullName = printedNameOf(card);

  return (
    <li className="flex flex-col" data-testid={basic ? "read-only-basic-tile" : "read-only-card-tile"}>
      <div
        className={`${TILE_SHELL} relative ${
          basic
            ? "[border:1px_dashed_var(--border-dashed)] bg-transparent"
            : "bg-[color:var(--surface)] [border:1px_solid_var(--border)] md:hover:[border:1px_solid_var(--border-strong)]"
        }`}
        {...preview}
      >
        <CardDetailTrigger
          oracleId={card.oracleId}
          name={fullName}
          siblings={siblings}
          // The trigger's label replaces everything nested in it, and the drawn `×N` is aria-hidden,
          // so a card the precon lists more than once says so here, as the deck tile does.
          ariaLabel={card.quantity > 1 ? `${cardDetailCopy.triggerAria(fullName)}, ${copy.open.copiesAria(card.quantity)}` : undefined}
          className={`relative block w-full overflow-hidden ${TILE_ART_CLIP}`}
          style={{ aspectRatio: TILE_ART_RATIO, background: "var(--surface-sunken)" }}
        >
          {card.imageUri ? (
            <HydratedImg
              src={card.imageUri}
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          ) : (
            <span
              className="flex h-full items-center justify-center text-center font-mono text-[9px] leading-[1.4]"
              style={{ color: "var(--fg-locked)" }}
            >
              {addPanelCopy.tile.noArt}
            </span>
          )}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
          />
        </CardDetailTrigger>

        <CardTileCaption
          meta={
            basic ? (
              <>
                <span className="flex-none" style={{ color: "var(--fg-body)" }}>{copy.open.basicCount(card.quantity)}</span>
                <span className="min-w-0 truncate" style={{ color: "var(--fg-faint)" }}>{copy.group.basicTag}</span>
              </>
            ) : (
              <>
                <OwnershipDot
                  owned={card.owned}
                  className="w-[8px] h-[8px] flex-none"
                  label={card.owned ? "Owned" : "Not owned"}
                />
                {!card.owned && (
                  <span aria-hidden className="flex-none" style={{ color: "var(--fg-faint)" }}>{copy.open.tileNotOwned}</span>
                )}
                {card.quantity > 1 && (
                  <span aria-hidden className="flex-none" style={{ color: "var(--fg-body)" }}>
                    {addPanelCopy.row.quantity(card.quantity)}
                  </span>
                )}
              </>
            )
          }
          name={printedFaceName(card)}
          nameSub={sub ?? undefined}
        />
      </div>
    </li>
  );
}
