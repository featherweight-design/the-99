"use client";

// The card view's unit (#349) — Matrix 2 of STATES-card-surfaces.md.
//
// Built from `collection/grid-view.tsx`'s tile, and since card captions (R1)
// the two have shared the caption itself — `ui/card-tile-caption.tsx`. Three deltas
// remain: this one carries an ownership dot on the meta line, has no set/rarity
// caption, and ends the caption with a full-height `✕` column. It is not a fork
// of `suggestion-tile.tsx` — that one carries evidence bars, an Add button and a
// two-line clamped name it needs to keep a shelf of tiles in alignment, none of
// which a decklist tile has any use for.
//
// NOTHING IS DRAWN OVER THE ART. The four marks that used to hold its corners —
// the availability chip, the collapsed `$`, the proxy `P` and the `×N` badge —
// are on the caption's meta line, and the bottom wash deleted with them. The one
// exception is a tile with NO art, whose plate prints no cost of its own and so
// keeps the drawn pips; on a tile that has art the cost is spoken instead.

import { removeCardFromDeck } from "../../app/decks/actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { cardTileCopy, spokenManaCost } from "../../lib/copy/card-surfaces";
import { cssUrl, printedFaceName, printedNameOf } from "../../lib/collection/browse";
import { availabilityState } from "../../lib/decks/availability";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { AvailabilityMarker } from "../ui/availability-marker";
import { CardTileCaption } from "../ui/card-tile-caption";
import { CostPips, parseManaCost } from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { BuyTag } from "./buy-tag";
import { CardDetailTrigger, cardDetailCopy } from "../cards/card-detail-provider";
import { TwoFacedMark } from "../cards/two-faced-mark";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { MutationError } from "./mutation-error";
import { usePendingChange } from "./pending-change";
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
  // One predicate for the whole proxied state, read the same way the slot reads
  // it. The matrix ties the dot, the count and the mark to one another
  // (`STATES-card-captions.md:31`), so three independent tests here is three
  // chances for them to disagree.
  const proxied = deckRowTag(card) === "proxy";
  // The draft's second consumer (#389 surface 1; card captions R1 call B). The
  // list has had this since versioning shipped and the card view has had
  // nothing, so a deck with an uncommitted draft photographed identically in
  // card view whether the draft was clean or not.
  const pendingMove = usePendingChange()?.moves.get(card.oracleId);
  // `from` is 0 for a card the version did not hold at all — the plain add —
  // which `PendingChangeMove` already documents, so the two figures need no
  // query the provider is not already making.
  const draftFigure = pendingMove
    ? pendingMove.from > 0
      ? deckVersioningCopy.pending.tilePair(pendingMove.from, pendingMove.to)
      : deckVersioningCopy.pending.tileAdded(pendingMove.to)
    : null;
  // Spoken separately: the figure is drawn in the count's position with no
  // words around it, and an edge colour is not something a reader can be asked
  // to infer. These are the row's own strings.
  const draftSpoken = pendingMove
    ? pendingMove.from > 0
      ? deckVersioningCopy.pending.addMarkRecountedA11y(pendingMove.from, pendingMove.to)
      : deckVersioningCopy.pending.addMarkA11y
    : null;
  const displayName = printedFaceName(card);
  const fullName = printedNameOf(card);
  // Null unless the string holds symbols this app can draw, so both branches
  // below agree on what "has a cost" means.
  const cost = card.manaCost && parseManaCost(card.manaCost).length > 0 ? card.manaCost : null;

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
          <CardDetailTrigger
            oracleId={card.oracleId}
            name={fullName}
            siblings={siblings}
            // `undefined` below one copy on purpose: that is what makes the
            // provider compose the label from `name`, which carries the full
            // printed name. The single-copy tile is the common case, and a
            // ternary fixed on one arm alone would leave it on the oracle name.
            ariaLabel={
              card.quantity > 1 && !proxied
                // `!proxied` for the same reason the drawn count is suppressed:
              // a quantity the proxy state does not claim must not be claimed to
              // a reader who cannot see that it was withheld.
              ? `${cardDetailCopy.triggerAria(fullName)}, ${cardTileCopy.copiesAria(card.quantity)}`
                : undefined
            }
            /* The bottom wash deletes with the marks it was holding off the
               art (call D). The 1px inner edge stays — it keeps a pale card
               frame from bleeding into the tile plate, which is a job nothing
               else does. */
            className="block w-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
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

          {/* Outside the trigger: `CardDetailTrigger` carries its own accessible
              name, which replaces everything nested under it, so a cost spoken
              in there would be spoken nowhere.

              The ownership dot used to share this corner. It is on the caption's
              meta line now with the rest of the marks (call D), which leaves
              this position to the one thing that still has to be drawn over the
              art's box.

              No drawn pips over art. The card prints its own cost in its own
              top-right corner, and a run of discs over the bottom-left said the
              same thing a second time in a worse hand. The list view keeps its
              pips, because there the row has no art to read it off.

              A tile with NO art keeps them, for that same reason read the other
              way: the plate it draws instead prints nothing, so the pips are the
              only cost anyone can see. That plate is not the illustration call D
              emptied — it is the absence of one.

              Either way the cost is SPOKEN. "The card is visible" is an argument
              about a reader who can see the art; it reaches nobody using a
              screen reader, for whom the pips were the only cost this tile
              carried.

              PARSED, not merely truthy — the same test `decklist-row.tsx` makes.
              `spokenManaCost` answers `no mana cost` for a string it cannot
              parse, which is a claim about the card rather than about the
              string: a stored cost that is nonempty and unreadable would be
              announced as a land. `CostPips` drew nothing for it, and nothing is
              still the right answer. */}
          {cost ? (
            card.imageUri ? (
              <span className="sr-only">{spokenManaCost(cost)}</span>
            ) : (
              <span
                data-testid="tile-cost-pips"
                className="absolute left-[6px] bottom-[6px] z-10 pointer-events-none flex items-center"
              >
                <CostPips cost={cost} size={11} className="flex gap-[3px]" spoken />
              </span>
            )
          ) : null}
        </div>

        {/* Caption — the marks, the name, and the only route out of the deck in
            this view. The meta line's order is the one `STATES` fixes: the dot,
            then the one slot, then the count. */}
        <CardTileCaption
          meta={
            <>
              {/* HOLLOW AND DASHED WHEN PROXIED, whatever the collection says.
                  `owned` is a fact about the box and `proxied` a fact about this
                  deck's slot, and `grouping.ts:26-30` rules that the two must be
                  allowed to disagree out loud: *not in your collection · this
                  deck's slot is filled*. Folding the proxy into `owned` would be
                  the lie; drawing a filled dot beside a `P` is the other one. */}
              <OwnershipDot
                owned={card.owned && !proxied}
                committed={availState === "hard" || availState === "over"}
                className="w-[8px] h-[8px] flex-none"
                label={card.owned && !proxied ? "Owned" : "Not owned"}
              />
              {/* THE SAME EXCLUSIVE DECISION THE LIST ROW MAKES, and the reason
                  all three occupants had to move together: read off `card.owned`
                  alone, this tile drew a buy tag on a printed card — the Card
                  view telling the player to buy something the List view says
                  they are printing, on one deck, one card, one glance apart.

                  Off the art the three are one box in three inks, which is what
                  turns the one-slot rule from a convention into something a
                  reader can see. Leaving any one of them on the art would put
                  one slot in two places. */}
              {proxied ? (
                <ProxyTag variant="band" plate={false} />
              ) : card.owned ? (
                card.availability && (
                  <AvailabilityMarker
                    availability={card.availability}
                    density="chip"
                    plate={false}
                    selfExcluded
                    // Nothing wraps the chip, so it carries §17's prose itself.
                    spoken
                  />
                )
              ) : (
                <BuyTag
                  variant="tile"
                  plate={false}
                  density="collapsed"
                  label={cardTileCopy.slotUnownedAria}
                />
              )}
              {/* Absent at one copy — the delta from `grid-view`, which draws
                  `×1` on a collection where one copy is the common case and the
                  badge is that tile's only count.

                  Absent when proxied too, which the matrix leaves empty: a proxy
                  covers this deck's whole ask for the card and takes no quantity
                  (proxies ruling 5), so a count here would claim a number the
                  state does not have. */}
              {/* The draft's figure TAKES the count's position rather than
                  sitting beside it, which is what resolves the double statement
                  the row resolves by suppressing `×N` beside the name. The row
                  suppresses on a recount only, because an add there has no
                  figure to put in the name's place; here both cases displace the
                  count, because both have one. */}
              {draftFigure ? (
                <>
                  <span aria-hidden className="flex-none" style={{ color: "var(--accent)" }}>
                    {draftFigure}
                  </span>
                  <span className="sr-only">{draftSpoken}</span>
                </>
              ) : (
                card.quantity > 1 && !proxied && (
                  <span aria-hidden className="flex-none" style={{ color: "var(--fg-body)" }}>
                    {addPanelCopy.row.quantity(card.quantity)}
                  </span>
                )
              )}
            </>
          }
          /* The printed front face, single line and never clamped.

             It carries no `title` and no `aria-label`. An `aria-label` on a
             plain `<span>` is exposed to nothing — it would pass a
             testing-library query and reach no screen reader. The full name's
             home is the trigger above, which is a real `<button>` and is the
             tile's largest target. */
          draftTouched={pendingMove !== undefined}
          name={displayName}
          nameTrail={<TwoFacedMark layout={card.layout} />}
          trailing={
            /* A full-height column rather than an item on the name line: this
               is the only way to remove a card in card view, so it takes the
               floor rather than the shortcut exception, and height is what a
               vertically-scrolling grid has to spend. Revealed on tile hover,
               which is a desktop idea — the phone keeps it drawn. */
            <button
              type="button"
              onClick={handleRemove}
              disabled={isPending}
              className="flex-none self-stretch flex items-center justify-center w-[44px] md:w-[32px]
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
          }
        />
      </div>
      {error && !shellReportsFailure && <MutationError message={error} />}
    </li>
  );
}
