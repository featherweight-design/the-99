"use client";
// Card-art gallery per property table §Grid Tile (State 1b).
//
// Grid: 2-up mobile, and a TILE FLOOR on desktop rather than a column count —
// `repeat(auto-fill, minmax(178px, 1fr))`, which is six at the 1300px reference
// width and fewer as the window narrows. It was a fixed 5-up until card
// captions (R1) ruled the 178px tile; see the grid's own comment for why a
// fixed six was rejected.
//
// Nothing is drawn over the art. The availability chip and the count are on the
// caption's meta line, and the bottom wash went with them.
//
// Missing art → color-identity gradient (READINESS #4).

import type { BrowseListCard } from "../../lib/collection/browse";
import { printedFaceName, printedNameOf } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/collection/gradients";
import { availabilityState } from "../../lib/decks/availability";
import { AvailabilityMarker } from "../ui/availability-marker";
import { CardFactMark } from "../cards/card-fact-mark";
import { comboClauseSpoken } from "../cards/combo-clause";
import { ComboMark } from "../cards/combo-mark";
import { FactTooltip } from "../cards/fact-tooltip";
import { CollectionMarkKey } from "./collection-mark-key";
import { cardFactName, cardMarkCopy } from "../../lib/copy/card-mark";
import { CardTileCaption, TILE_ART_CLIP } from "../ui/card-tile-caption";
import { GhostButton } from "../ui/button";
import { HydratedImg } from "../ui/hydrated-art";

/**
 * Tiles whose art the server HTML asks for. The server cannot know the width, so this is a fixed
 * count rather than columns times rows. The track is `minmax(178px, 1fr)` with a 20px gap beside
 * the 62px rail and 34px of padding a side, so it holds 6 columns at 1300px, 7 at 1536 and 9 at
 * 1920, and a first screen is about 18 tiles at 1300x900 and 27 at 1920x1080; on a phone it is
 * two columns, about 4 tiles. Every eager tile is art downloading beside the page's scripts,
 * so the count is a trade between first art and time to interactive. Measured on the slow profile
 * (list payload plan, PR 4): 4 eager tiles hydrate as fast as bare `/collection` at 1300 and 390
 * and paint first art 10.5s and 4.3s sooner than none; 12 cost ~4.7s of hydration at 1300.
 */
export const GRID_EAGER_TILES = 4;

export function GridView({
  cards,
  totalCards,
  onShowMore,
  onOpen,
  pendingOracleId = null,
  busy = false,
}: {
  cards: BrowseListCard[];
  totalCards: number;
  onShowMore: () => void;
  /**
   * The rows a filter or `Show more` asked for are still arriving (list payload plan, PR 4): the
   * list keeps the rows it drew and says so with `aria-busy`, and `Show more` ignores a press
   * while it waits. No drawn waiting state: the rows land in about one round trip.
   */
  busy?: boolean;
  onOpen: (oracleId: string) => void;
  /** The tile whose card is being fetched, which shows the click landed. */
  pendingOracleId?: string | null;
}) {
  return (
    /* §Grid Container. The desktop track is a TILE FLOOR rather than a column
       count (card-captions readiness, erratum 5): `md:grid-cols-6` would begin
       at 768px, where this container has 638px of track and six columns is a
       90px tile — half the phone tile whose parity is the whole argument for the
       178px figure. A floor holds the tile and lets the count fall out: six at
       the 1300px reference width, three at 768.

       The phone keeps an explicit 2-up. At 390px the track is 362px, which one
       178px floor plus a gap already exceeds, so auto-fill there would collapse
       to a single column. */
    <div aria-busy={busy || undefined} className="grid grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))] gap-[12px] md:gap-[20px] px-[14px] md:px-[34px] pt-[4px] md:pt-[20px] pb-[14px] md:pb-[34px]">
      {/* The gloss travels WITH the view: a surface drawing a wordless mark carries the
          thing that decodes it, rather than trusting a caller to mount one above. */}
      <CollectionMarkKey className="col-span-full" />
      {cards.map((c, i) => {
        const state = c.availability ? availabilityState(c.availability) : "free";
        // Addendum 2 §2, matching the row: over-committed keeps its border tint
        // and nothing else.
        const border =
          state === "over"
            ? "[border:1px_solid_var(--avail-over-border)] hover:[border:1px_solid_var(--avail-over-border)]"
            : "[border:1px_solid_var(--border)] hover:[border:1px_solid_var(--accent)]";
        const pending = pendingOracleId === c.oracleId;
        return (
        <button
          key={c.oracleId}
          type="button"
          onClick={() => onOpen(c.oracleId)}
          // Never `disabled`, for the reason CardDetailTrigger states: disabling
          // the focused tile blurs it, and the modal's focus-return would then
          // have nothing to hand focus back to on close.
          aria-busy={pending}
          style={pending ? { opacity: 0.55 } : undefined}
          // §Grid Tile Container: radius 9/10px, overflow hidden, bg --surface, border 1px --border
          // Background and border are utilities, not inline style: an inline
          // border outranks the hover: variant and the accent hover never lands.
          className={`text-left overflow-hidden rounded-[9px] md:rounded-[10px] md:cursor-pointer bg-[color:var(--surface)] ${border}`}
        >
          {/* Art region — §Grid Tile: Art Region */}
          <div
            /* The bottom wash is gone with the marks it was holding off the art
               (call D). The 1px inner edge stays: it is not a scrim for a mark,
               it keeps a pale card frame from bleeding into the tile plate. */
            /* `TILE_ART_CLIP`: the shell rounds this box's top corners because they are
               the tile's; the bottom two sit against the caption and were square, so a
               card whose Scryfall JPEG carries a white corner matte drew a pale notch
               above the caption. Same defect and same fix as the deck's Card view. */
            className={`relative overflow-hidden ${TILE_ART_CLIP}`}
            style={{
              aspectRatio: "63/88",
              background: c.imageUri ? undefined : identityGradient(c.colorIdentity),
            }}
          >
            {/* THE ART WAITS FOR THE PAGE, except the first screen's. A CSS background is
                fetched for every rendered tile, on screen or not, which asked for all 200
                windowed tiles' art at once (list payload plan, PR 1). A native lazy img fixed
                that, but it still starts on the HTML parse: on a slow link, once the server
                draws the grid, ~2.4MB of Scryfall `normal` images landed BEFORE hydration
                and the page became usable at ~20s instead of ~6s (PR 4's measurement, on
                `?view=grid`). `HydratedImg` (`ui/hydrated-art`) withholds `src` until the
                tile is near the viewport, which it can only learn after hydration; the first
                screen's tiles are `eager` and ask for their art in the server HTML. The FILE
                stays `normal`: `small` is 146px against a 175-178px tile, soft at any
                density. `object-fit: cover` centred is what `background-size: cover` drew. */}
            {c.imageUri && (
              <HydratedImg
                eager={i < GRID_EAGER_TILES}
                src={c.imageUri}
                alt=""
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            )}
            {/* The 1px inner edge, drawn OVER the art. An inset shadow on this box would
                paint under its img child and vanish. `rounded-[inherit]` keeps the edge on
                the clip's rounded corners. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]"
            />
          </div>

          {/* Caption, three lines. Everything that used to sit on the art is on the
              meta line: the availability chip, then the bracket marks and the combo
              mark. The name follows with its count, and `SET · rarity` sits under it
              as sub-text (`nameSub`) — it rode the meta line's right end until the
              marks there pushed it off the tile (2026-09-23). */}
          <CardTileCaption
            meta={
              <>
                {c.availability && (
                  <AvailabilityMarker
                    availability={c.availability}
                    density="chip"
                    plate={false}
                    spoken
                  />
                )}
                {/* Absent at one copy, matching the deck tile. It used to be
                    unconditional, because on a collection one copy is the common
                    case and the badge was the tile's ONLY figure — `×1` at least
                    said the count was known. The meta line ended that: the count
                    now sits beside an availability chip and a set code, so `×1`
                    is the one figure there that tells the reader nothing, said
                    loudest on the most ordinary card in the collection. */}
                {/* The count has LEFT this line — see `nameTrail` below. The marks take the
                    room it used: at 157px on a phone the meta line cannot hold a chip, a
                    count, a set code and up to three glyphs, and the count is the one
                    occupant that reads just as well beside the name.

                    The standing bracket facts, after the chip. 16px, the one size
                    the mark draws at on every surface — a dense caption does not get a
                    smaller one, because the same fact would then read as two marks.

                    aria-hidden, because this tile composes its accessible name from its
                    text content: the clause is placed explicitly below, after the card's
                    own name, rather than being read out of the meta line before it. */}
                {(c.facts ?? []).map((fact) => (
                  <FactTooltip key={fact} fact={fact}>
                    <CardFactMark fact={fact} silent />
                  </FactTooltip>
                ))}
                {/* One more 16px glyph in a marker row built for them, last in the order. */}
                {c.comboPartner && (
                  <ComboMark
                    partnerName={c.comboPartner.name}
                    otherPartners={c.comboOtherPartners ?? 0}
                  />
                )}
              </>
            }
            /* `SET · rarity` sits UNDER the name, as sub-text. It rode the meta line's right
               end, and once a card carried the chip, three bracket marks and the combo mark
               there was no room left: a tutor's `TLE ·` was cut at the tile's edge and its
               rarity never showed. Ruled by Hugh on 2026-09-23. With a line of its own it
               also shows the rarity on a phone, where the meta line had only had room for
               the set code. */
            nameSub={
              <>
                {c.primarySetCode} · {c.rarity}
              </>
            }
            /* The name printed on the copy the player owns, front face only,
               single line and never clamped. This surface carries no `//` mark
               (spec errata 3) — the set code below is the fact that explains the
               name.

               The tile is a real <button> whose accessible name is its text
               content, so the clipped caption is hidden from assistive tech and
               the whole name spoken from an sr-only sibling — rather than a
               renamed two-faced card being announced as its front face alone.
               For every card that is not renamed the two strings are identical
               and nothing moves. */
            name={printedFaceName(c)}
            nameHidden
            /* The count, moved off the meta line. `nameTrail` is the name line's own slot
               and it is FREE on this surface — its only other occupant is the `//` mark,
               which /collection never draws (spec errata 3). No new prop was needed.
               Still `aria-hidden`: the tile speaks its name from `nameSpoken`, and the
               count was never part of that sentence before this move or after it. */
            nameTrail={
              c.quantity > 1 ? (
                <span
                  aria-hidden
                  className="flex-none font-mono text-[10px] md:text-[10.5px] tabular-nums"
                  style={{ color: "var(--fg-faint)" }}
                >
                  ×{c.quantity}
                </span>
              ) : undefined
            }
            nameSpoken={
              <span className="sr-only">
                {printedNameOf(c)}
                {/* The facts ride the SPOKEN name rather than the meta line, so they are
                    heard straight after the card they describe. The glyphs above are
                    aria-hidden, which is what lets this sit in the reading order the
                    sentence wants instead of wherever the layout happens to put them. */}
                {c.facts?.length ? `, ${cardMarkCopy.rowAria(c.facts.map(cardFactName))}` : ""}
                {/* The combo clause rides here for the same reason the facts do — heard
                    straight after the card it describes — and in its FULL spoken form, which
                    names what the glyph means. The drawn clause above is aria-hidden. */}
                {c.comboPartner
                  ? `, ${comboClauseSpoken(c.comboPartner.name, "ownBoth")}`
                  : ""}
              </span>
            }
          />
        </button>
        );
      })}

      {cards.length < totalCards && (
        <GhostButton
          type="button"
          onClick={busy ? undefined : onShowMore}
          aria-busy={busy || undefined}
          className="col-span-full mx-auto text-[13px] px-[16px] py-[9px] mt-[6px]"
        >
          Show more ({(totalCards - cards.length).toLocaleString()} more)
        </GhostButton>
      )}
    </div>
  );
}
