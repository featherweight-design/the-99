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
// NOTHING IS DRAWN OVER THE ART, with one exception named below: the draft's
// accent rule crosses it deliberately (erratum 10), because a mark confined to
// the caption was the thing that went unnoticed. The four marks that used to
// hold the art's corners —
// the availability chip, the collapsed `$`, the proxy `P` and the `×N` badge —
// are on the caption's meta line, and the bottom wash deleted with them. The one
// exception is a tile with NO art, whose plate prints no cost of its own and so
// keeps the drawn pips; on a tile that has art the cost is spoken instead.

import { useId } from "react";

import { hasFrontFaceCost } from "../../lib/cards/faces";
import { removeCardFromDeck } from "../../app/decks/actions";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { cardTileCopy, spokenManaCost } from "../../lib/copy/card-surfaces";
import { printedFaceName, printedNameOf } from "../../lib/collection/browse";
import { availabilityState } from "../../lib/decks/availability";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import { AvailabilityMarker } from "../ui/availability-marker";
import { CardTileCaption, TILE_ART_CLIP, TILE_ART_RATIO, TILE_SHELL } from "../ui/card-tile-caption";
import { cardFactName, cardMarkCopy } from "../../lib/copy/card-mark";
import { CardFactMark } from "../cards/card-fact-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { CostPips } from "../ui/cost-pips";
import { OwnershipDot } from "../ui/ownership-dot";
import { BuyTag } from "./buy-tag";
import { CardDetailTrigger, cardDetailCopy, type Sibling } from "../cards/card-detail-provider";
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
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { useLockCards } from "./lock-cards";
import { LockMark } from "./lock-mark";
import { deckRowTag } from "../../lib/decks/row-tag";
import { usePreviewRow } from "./hover-preview";
import { FadingImg } from "../ui/hydrated-art";

// The shell and the art ratio live in `ui/card-tile-caption`, a server-safe module: this one is
// `"use client"`, so a server component reading them from here got client references, not strings.
export { TILE_ART_RATIO, TILE_SHELL };

export function DeckCardTile({
  deckId,
  card,
  siblings,
  spent = false,
}: {
  deckId: string;
  card: DeckDetailCard;
  /** The decklist in display order, so the modal's Prev/Next page through it. */
  siblings?: readonly Sibling[];
  /** See DecklistRow — the decklist owns this, not the tile. */
  spent?: boolean;
}) {
  const { isPending, error, run } = useDeckMutation(false, DECK_REMOVE_FALLBACK_MESSAGE);
  // The same hover preview the list row draws, borrowed from the decklist's provider.
  const previewHandlers = usePreviewRow(card.imageUri);
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
  // DRAWN only when the count position is the draft's to take. A proxied tile
  // leaves that position empty whatever the draft did — the two states are
  // orthogonal, and `STATES-card-captions.md` says a proxied card in a dirty
  // draft draws the caption edge and the `P`, not a figure. A proxy covers this
  // deck's whole ask and takes no quantity, so a number here would contradict
  // the same invariant that suppresses `×N` two positions along.
  //
  // The SPOKEN form is unaffected and still rendered: the draft touched this
  // card either way, and gating the description on `proxied` would leave the
  // trigger's `aria-describedby` pointing at nothing.
  // ONLY A RECOUNT PRINTS A FIGURE. A pair says something the count cannot —
  // `6 → 8` is a move — where `+1` restated what the row beside it already
  // showed, and in a singleton format nearly every add is `+1`. An add falls
  // through to the ordinary count instead, which is exactly what the list does:
  // `decklist-row.tsx` prints its glyph on `quantity > 1 && !recounted`, so an
  // added singleton is a bare name there too. More than one copy still shows,
  // because that is a number the reader could not have assumed.
  const draftFigure =
    pendingMove && !proxied && pendingMove.from > 0
      ? deckVersioningCopy.pending.tilePair(pendingMove.from, pendingMove.to)
      : null;
  // Spoken separately: the figure is drawn in the count's position with no words
  // around it, and an edge colour is not something a reader can be asked to
  // infer. These are the row's own strings, including its distinction between a
  // recount that went UP and one that came DOWN — calling a cut a pending add
  // would say the opposite of what happened to the card.
  const draftSpoken = pendingMove
    ? pendingMove.from > 0
      ? pendingMove.to > pendingMove.from
        ? deckVersioningCopy.pending.addMarkRecountedA11y(pendingMove.from, pendingMove.to)
        : deckVersioningCopy.pending.cutMarkRecountedA11y(pendingMove.from, pendingMove.to)
      : deckVersioningCopy.pending.addMarkA11y
    : null;
  // The description has to be ASSOCIATED, not merely present. `CardDetailTrigger`
  // is the tile's focusable element and its `aria-label` replaces everything
  // nested inside it, so an `sr-only` sibling sitting in the caption is read in
  // document order and skipped entirely by a reader tabbing between controls —
  // which is how most people meet this tile. The row solves it the same way.
  const draftDescriptionId = useId();
  // Locked (PR 4b), read exactly as `decklist-row.tsx` reads it. `null` with the switch off, and then
  // nothing below draws a lock: the tile is the tile it was. `locked` is the drawn answer, a press
  // on this visit included (`useCardLocks`). The card view renders under `All` only, so the mode
  // needs no Shopping test here.
  const lockCards = useLockCards();
  const locked = lockCards !== null && card.locked === true;
  const lockMode = lockCards?.mode === true;
  const lockError = lockCards?.errors.get(card.oracleId) ?? null;
  const lockDescriptionId = useId();
  // Both ids in reading order, as the row does: that the card is locked, then what the draft did.
  // Said in the mode too, where the drawn mark gives way to the toggle but the card is no less
  // locked.
  const describedBy =
    [locked ? lockDescriptionId : null, pendingMove ? draftDescriptionId : null].filter(Boolean).join(" ") ||
    undefined;
  /** Spoken after the name, in the vocabulary's own order — see the `ariaLabel` below. */
  const factClause = card.facts?.length
    ? `, ${cardMarkCopy.rowAria(card.facts.map(cardFactName))}`
    : "";
  const displayName = printedFaceName(card);
  const fullName = printedNameOf(card);
  // Null unless the string holds symbols this app can draw, so both branches
  // below agree on what "has a cost" means.
  const cost = hasFrontFaceCost(card.manaCost) ? card.manaCost : null;

  function handleRemove() {
    const generation = markSlotSpent(card);
    run(
      async () => {
        try {
          await removeCardFromDeck(deckId, card.oracleId);
        } catch (cause) {
          if (shellReportsFailure) reportRemoveFailure(card.oracleId, card.name, generation);
          throw cause;
        }
      },
      () => removeOptimisticCard(card),
    );
  }

  if (spent) return <UndoTile deckId={deckId} card={card} />;

  return (
    <li className="flex flex-col" {...previewHandlers}>
      <div
        /* THE WHOLE LEFT EDGE, art included. It was on the caption, on call B's
           reasoning that the shell's border already carries over-committed and
           two unrelated facts should not share one edge.
           `decklist-row.tsx:268-269` had already settled that the other way and
           shipped it: the row stacks `inset 2px 0 0 0 --accent` and
           `inset 0 0 0 1px --avail-over-border` on one element, and a row that is
           both reads fine — the chip carries the shortfall, the edge carries the
           draft. Over 46px of caption the accent was easy to miss; over a whole
           tile it is not, and the two views now say it the same way. */
        className={`${TILE_SHELL} relative bg-[color:var(--surface)] ${
          availState === "over"
            ? "[border:1px_solid_var(--avail-over-border)]"
            : "[border:1px_solid_var(--border)] md:hover:[border:1px_solid_var(--border-strong)]"
        }`}
      >
        {/* A DRAWN ELEMENT, not an inset shadow on the shell. An inset shadow
            paints above the element's own background and BELOW its descendants,
            and the art below is full-bleed and opaque from x=0 — so a shadow on
            the shell was covered for the whole height of the picture and
            showed only across the caption strip. That is the reach the move was
            made to escape, and `onShell` would have reported it fixed.
            `decklist-row.tsx` gets away with a shadow because a row has no
            opaque full-width child. */}
        {pendingMove && (
          <span
            aria-hidden
            className="absolute left-0 top-0 bottom-0 w-[2px] z-20 pointer-events-none bg-[color:var(--accent)]"
          />
        )}
        <div className="relative">
          <CardDetailTrigger
            oracleId={card.oracleId}
            name={fullName}
            siblings={siblings}
            describedBy={describedBy}
            // `undefined` below one copy on purpose: that is what makes the
            // provider compose the label from `name`, which carries the full
            // printed name. The single-copy tile is the common case, and a
            // ternary fixed on one arm alone would leave it on the oracle name.
            // THE FACT CLAUSE HAS TO BE IN HERE. The mark below is `silent`, and this
            // `aria-label` REPLACES everything nested inside the trigger — so a mark
            // drawn in the caption is announced by nothing at all unless the label says
            // it. /collection's tile composes the same clause for the same reason
            // (`grid-view.tsx`); the decklist row instead leaves its mark unsilenced,
            // because that row's name is not a composed string.
            ariaLabel={
              card.quantity > 1 && !proxied
                // `!proxied` for the same reason the drawn count is suppressed:
              // a quantity the proxy state does not claim must not be claimed to
              // a reader who cannot see that it was withheld.
              ? `${cardDetailCopy.triggerAria(fullName)}, ${cardTileCopy.copiesAria(card.quantity)}${factClause}`
                // `undefined` keeps the provider's own composition where there is
                // nothing to add; a fact is the one thing worth composing for.
                : factClause
                  ? `${cardDetailCopy.triggerAria(fullName)}${factClause}`
                  : undefined
            }
            /* The bottom wash deletes with the marks it was holding off the
               art (call D). The 1px inner edge stays — it keeps a pale card
               frame from bleeding into the tile plate, which is a job nothing
               else does. */
            /* `TILE_ART_CLIP` rounds the art's BOTTOM corners, which the shell does not:
               they sit against the caption rather than against the tile's edge, so a
               card whose Scryfall JPEG carries a white corner matte drew a pale notch
               there. The 1px inner edge follows the radius with it. */
            className={`relative block w-full overflow-hidden ${TILE_ART_CLIP}`}
            style={{
              aspectRatio: TILE_ART_RATIO,
              // A card with no art draws a plate rather than a colour-identity
              // gradient: the decklist read carries no colour identity, and a
              // gradient guessed from nothing would be a claim about the card.
              background: "var(--surface-sunken)",
            }}
          >
            {/* AN IMG, LOADED LAZILY, as the /collection grid's (list payload plan): a CSS
                background is fetched for every tile whether or not it is on screen, so a
                99-card deck asked for every card's `normal` art at once. `object-cover`
                centred is exactly what `center / cover` drew. */}
            {card.imageUri ? (
              <FadingImg
                src={card.imageUri}
                alt=""
                loading="lazy"
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
            {/* The 1px inner edge, drawn OVER the art: an inset shadow on this box paints
                under its img child. `rounded-[inherit]` keeps it on the clipped corners. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
            />
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
                  <AvailabilityMarker bareOne
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
              {/* A RECOUNT's pair takes the count's position, which is what
                  resolves the double statement the row resolves by suppressing
                  `×N` beside the name. An add has no figure at all since erratum
                  11 — `+1` restated the count — so it falls through to the count
                  itself, which is exactly what the row does. */}
              {draftFigure ? (
                <span aria-hidden className="flex-none" style={{ color: "var(--accent)" }}>
                  {draftFigure}
                </span>
              ) : (
                card.quantity > 1 && !proxied && (
                  <span aria-hidden className="flex-none" style={{ color: "var(--fg-body)" }}>
                    {addPanelCopy.row.quantity(card.quantity)}
                  </span>
                )
              )}
              {/* The standing bracket facts, last on the line — after the occupants that
                  describe THIS DECK'S SLOT (the dot, the chip, the count) because these
                  describe the CARD, and are true of it in any deck or none.

                  16px, the one size the mark draws at on every surface.
                  `silent` because the caption composes the tile's spoken name, exactly as
                  /collection's does.

                  This tile drew no mark at first, and the key was suppressed here to match
                  — which made Card view the one place a reader saw neither the glyphs nor
                  the words. The fix was always this direction: a surface that shows cards
                  shows what they are. */}
              {/* THE LOCK (Locked, PR 4b), after the dot and the slot and before the fact marks
                  (STATES, card tile). Hidden in the mode, where the ✕ column is the toggle and
                  says the same thing in accent.

                  THE TRUNCATION ORDER (audit F8). The meta line has no overflow rule of its own
                  and at 390 it has about 120px, which a dot, a chip, a count and two fact marks
                  already reach. Everything before the facts is `flex-none`, the lock included, so
                  the facts are the one thing on the line that gives way. They sit in a group that
                  WRAPS inside a one-glyph box and clips, so a mark that does not fit drops whole
                  rather than being cut through. The group's first line opens with a zero-width
                  item, because a wrapping line always keeps its first item: without it the first
                  mark would stay on line 1 and be sliced when less than a glyph is left. The
                  spacing rides each later mark rather than a gap, so the zero-width item moves
                  nothing on a roomy line. The lock, the only place a tile says it is
                  locked, never drops. A dropped fact is still spoken: the trigger's label carries
                  every one. */}
              {locked && !lockMode && (
                <span className="flex flex-none items-center" data-testid="tile-lock-mark">
                  <LockMark title={lockedCardsCopy.mark.title} />
                </span>
              )}
              {card.facts?.length ? (
                <span
                  className="flex min-w-0 flex-wrap items-center h-[16px] overflow-hidden"
                  data-testid="tile-fact-marks"
                >
                  <span aria-hidden="true" className="w-0 flex-none" data-testid="tile-fact-lead" />
                  {card.facts.map((fact, i) => (
                    <span key={fact} className={`flex flex-none${i > 0 ? " pl-[6px]" : ""}`}>
                      <FactTooltip fact={fact}>
                        <CardFactMark fact={fact} silent />
                      </FactTooltip>
                    </span>
                  ))}
                </span>
              ) : null}
              {/* Rendered on `pendingMove`, NOT on `draftFigure`. A proxied tile
                  draws no figure and the draft still touched it, so a
                  description nested in the figure's branch would vanish exactly
                  when the trigger's `aria-describedby` still names it — a
                  dangling reference, and the state spoken nowhere. */}
              {pendingMove && (
                <span id={draftDescriptionId} className="sr-only">
                  {draftSpoken}
                </span>
              )}
              {/* Outside the drawn mark's branch, so the mode hiding the mark cannot leave the
                  trigger's `aria-describedby` pointing at nothing. */}
              {locked && (
                <span id={lockDescriptionId} className="sr-only">
                  {lockedCardsCopy.mark.a11y}
                </span>
              )}
            </>
          }
          /* The printed front face, single line and never clamped.

             It carries no `title` and no `aria-label`. An `aria-label` on a
             plain `<span>` is exposed to nothing — it would pass a
             testing-library query and reach no screen reader. The full name's
             home is the trigger above, which is a real `<button>` and is the
             tile's largest target. */
          name={displayName}
          nameTrail={<TwoFacedMark layout={card.layout} />}
          trailing={
            lockCards && lockMode ? (
              /* In the mode the ✕ column is the lock toggle (STATES, card tile), drawn at rest
                 rather than on hover: the column keeps its width, 32px on desktop and 44px on the
                 phone, so the mode costs the caption nothing. The box is 26×24 on desktop and 36px
                 on the phone, skinned as the row's: unlocked, an open lock on a `--border-strong`
                 box; locked, the closed lock in `--accent` on an accent box with a 14% fill. The ✕
                 returns on `Done`. */
              <button
                type="button"
                aria-pressed={locked}
                aria-label={lockedCardsCopy.mode.toggleAria(displayName)}
                aria-busy={lockCards.pending.has(card.oracleId)}
                onClick={() => lockCards.toggle(card)}
                data-testid="tile-lock-toggle"
                className="flex-none self-stretch flex items-center justify-center w-[44px] md:w-[32px] bg-transparent border-0 p-0 cursor-pointer"
              >
                <span
                  className={`flex items-center justify-center w-[36px] h-[36px] md:w-[26px] md:h-[24px] rounded-[6px] border ${
                    locked
                      ? "border-accent bg-[color:color-mix(in_oklab,var(--accent)_14%,transparent)]"
                      : "border-border-strong"
                  }`}
                >
                  <LockMark open={!locked} tone="mode" />
                </span>
              </button>
            ) : (
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
            )
          }
        />
      </div>
      {error && !shellReportsFailure && <MutationError message={error} />}
      {/* A refused lock reverts and says why here, under its tile, as the row does. */}
      {lockError && <MutationError message={lockError} />}
    </li>
  );
}
