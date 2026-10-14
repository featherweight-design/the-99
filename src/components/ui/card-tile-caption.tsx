// The caption under a card tile's art, on `/collection` and `/decks/[id]`.
//
// Design handoff `card_captions` (R1), call A: two lines, always, at a fixed
// height. The meta line carries the marks that used to sit on the illustration;
// the name line closes the tile. A caller that passes `nameSub` gets a THIRD
// line under the name and a taller fixed height to match (`/collection`'s
// `SET · rarity`, since 2026-09-23). The deck tile passes none and keeps two. A trailing column — the deck tile's `✕` — is
// paid for once at full height rather than inside either line.
//
// It is the CAPTION that is shared and not the tile (handoff §7). The deck's
// removal control carries `useDeckMutation`, `useRemoveOptimisticCard`,
// `markSlotSpent` and an undo receipt that `/collection` has no use for, so a
// shared tile would be the contortion the brief's ruling 7 predicted.

import type { ReactNode } from "react";

/**
 * The caption's height, at both widths. Exported because `deck-card-undo-tile`
 * has to report the same figure: it borrows `TILE_SHELL` and `TILE_ART_RATIO`
 * so a removed card leaves a hole exactly its own size, and a caption height
 * restated there would break that invariant the first time this one moved.
 *
 * `min-h` rather than `h`. The handoff warns that a fixed height swapped for a
 * floor under pressure is how this design fails — but the warning is about the
 * VALUE drifting per state, not about the property. No occupant of either line
 * can exceed one line: the name never wraps and the meta line's four positions
 * are all single figures. The floor is therefore fixed in practice, and it
 * degrades to taller rather than clipped if a future string is longer than any
 * that exists today.
 */
export const CARD_TILE_CAPTION_H = "min-h-[56px] md:min-h-[50px]";

/**
 * The height with a `nameSub` line: the two-line figure plus a 3px gap and the sub-line's box.
 * Phone: 56 + 3 + 11 = 70. Desktop: 50 + 3 + 12 = 65. A separate floor rather than the
 * two-line one left to be outgrown, because a floor that content always exceeds is the
 * minimum-that-never-binds the note below warns about.
 */
export const CARD_TILE_CAPTION_SUB_H = "min-h-[70px] md:min-h-[65px]";

/**
 * Both lines carry an EXPLICIT box height, and the caption's padding is chosen
 * so the two plus the gap add up to `CARD_TILE_CAPTION_H` exactly.
 *
 * Without them the lines size to their own text — a 9.5px mono line and a 13px
 * name at the inherited line-height — and the caption lands wherever that
 * happens to fall, which measured 49px on some tiles and 50px on others. A
 * floor that content always exceeds is not a fixed height; it is a minimum that
 * never binds, and the ragged grid it produces is the one failure this design
 * cannot survive. Phone: 8 + 17 + 3 + 20 + 8 = 56. Desktop: 6 + 18 + 3 + 17 + 6
 * = 50.
 */
const META_LINE = "h-[17px] md:h-[18px]";
const NAME_LINE = "h-[20px] md:h-[17px]";
/** The sub-line's box: the meta line's type, which sets glyphs 9-9.5px tall at `leading-none`. */
const SUB_LINE = "h-[11px] md:h-[12px]";
// With it the sum is 8 + 17 + 3 + 20 + 3 + 11 + 8 = 70 and 6 + 18 + 3 + 17 + 3 + 12 + 6 = 65,
// which is `CARD_TILE_CAPTION_SUB_H`.

/**
 * The one box the slot's three occupants share — the availability chip, the
 * collapsed buy tag and the proxy mark. Call D's payoff: off the art none of
 * them needs a scrim, and with no scrim they are the same box in three inks.
 *
 * It carries no border and no background. Both are the occupant's own: the
 * chip's edge is state-coloured, the proxy's is dashed, and the buy tag has
 * none. What is shared is the geometry, because that is the part a reader
 * compares.
 *
 * **The edge is an `outline`, never a `border`, and that is load-bearing.** A
 * border is layout — it makes the chip 2px taller than the two tags beside it,
 * which is exactly the difference that would leave "one box" a claim the eye
 * can refute. `proxy-tag.tsx` already ruled this for the same reason and took
 * an outline at `outlineOffset: -1px`, which draws inside the box without
 * occupying space and, unlike a box-shadow, can still be dashed.
 */
export const CARD_TILE_SLOT_BOX =
  "inline-flex items-center gap-[4px] flex-none rounded-[4px] px-[5px] py-[3px] " +
  "font-mono font-semibold text-[8.5px] md:text-[9px]";

/**
 * THE ART BOX'S OWN BOTTOM CORNERS, on every tile that pairs art with this caption.
 *
 * Scryfall's `normal` images are JPEGs, so they carry no alpha and the area outside the
 * card's rounded corner is a painted MATTE — and the matte colour is not consistent. Of
 * twelve printings sampled on 2026-09-21, five are white (`Dokuchi Silencer`,
 * `Mystical Tutor`, `Pact of Negation`, `The Ozolith`, `Aggravated Assault`) and seven
 * black. On a white one the corner reads as a pale notch against the tile plate.
 *
 * The tile's own shell rounds the art's TOP corners, because they are the tile's corners.
 * The bottom two are not: the caption sits directly under them, so nothing clipped the
 * matte and it drew as a ~6px white band immediately above the caption — reported by Hugh
 * on 2026-09-21 against the deck's Card view.
 *
 * THE RULE, for any box drawing a full card image: its radius must be at least **3.1% of
 * its rendered width**, which is the card's own corner arc — 14–16px across printings at
 * Scryfall's 488px width, so 3.1% is the conservative end of the range rather than one
 * card's figure. Measured on the build: the art box is 179px on the deck's Card view and 176px
 * on `/collection`'s grid at 1300, 171 and 173 at 390 — so 5.6px is the figure to beat and
 * the shell's own 9/10px clears it with room. It is stated as the shell's radius rather
 * than as a percentage so the two ends of the tile round by the same amount; a percentage
 * radius would be elliptical on a 63:88 box and differ top from bottom.
 */
export const TILE_ART_CLIP = "rounded-b-[9px] md:rounded-b-[10px]";

/** Radius, plate and art shape: everything the deck's undo tile shares with the live one, so a
 *  removed card leaves a hole exactly its own size, and what the precon and read-only tiles reuse.
 *  Here rather than in `decks/deck-card-tile.tsx`, which is `"use client"`: a SERVER component
 *  importing a value from a client module receives a client reference, not the string (the About
 *  page's precon specimen is one; `lib/copy/filter-chassis.ts` records the same failure). */
export const TILE_SHELL =
  "group flex flex-col overflow-hidden rounded-[9px] md:rounded-[10px]";
export const TILE_ART_RATIO = "63 / 88";

/**
 * A tile whose corners SCALE with its width: the deck's Card view (and the open precon's), which is two across up to
 * `md`, so a tile stretches to ~361px at 767px, where the 3.1% rule asks for 11px and the fixed 9px let the matte
 * through (the Unranked 2026-10-12 item, ruled 2026-10-14: fix the radius, not the column count, which is a layout
 * change). The tile's ROOT carries `TILE_FIELD`, a size container for its own width only, and the shell and the art
 * box round by `max(9px, 3.4cqw)` (10px from md), so a corner clears 3.1% at every width and keeps the fixed value
 * where the tile is narrow. `cqw` is relative to the nearest container ancestor, so these two classes are only for a
 * tile whose root has `TILE_FIELD`: without one `cqw` is the viewport's, not the tile's.
 */
export const TILE_FIELD = "[container-type:inline-size]";
export const TILE_SHELL_SCALED = "group flex flex-col overflow-hidden rounded-[max(9px,3.4cqw)] md:rounded-[max(10px,3.4cqw)]";
export const TILE_ART_CLIP_SCALED = "rounded-b-[max(9px,3.4cqw)] md:rounded-b-[max(10px,3.4cqw)]";

/** Draws an occupant's edge inside its box instead of around it. */
export function slotOutline(colour: string, dashed = false) {
  return {
    outline: `1px ${dashed ? "dashed" : "solid"} ${colour}`,
    outlineOffset: "-1px",
  } as const;
}

export function CardTileCaption({
  meta,
  name,
  nameHidden = false,
  nameSpoken,
  nameTrail,
  nameSub,
  trailing,
  compact = false,
}: {
  /**
   * The meta line's left group. Its contents are the CALLER's, and the two callers differ:
   * the deck tile draws the availability chip, the collapsed `$`, the proxy `P` and its
   * count here, while `/collection` draws the chip and the card's bracket marks and puts
   * its count on the name line instead (`nameTrail`) — at 157px that line cannot hold a
   * chip, a count, a set code and up to three glyphs.
   *
   * Left generic deliberately: this component is shared, and a doc describing one surface's
   * arrangement as though it were the prop's contract is how the other surface's author is
   * misled.
   */
  meta?: ReactNode;
  /** The printed front-face name. Truncation is this component's. */
  name: ReactNode;
  /**
   * Hide the drawn name from assistive tech. `/collection`'s tile is one
   * `<button>` whose accessible name is its text content, so the clipped
   * caption is hidden and the whole name spoken from `nameSpoken` instead.
   */
  nameHidden?: boolean;
  nameSpoken?: ReactNode;
  /**
   * The name line's own trailing slot. The deck's `//` mark, and on `/collection` the copy
   * count, which moved here from the meta line to make room for the bracket marks. The two
   * never coexist: `/collection` draws no `//` mark (spec errata 3).
   */
  nameTrail?: ReactNode;
  /**
   * A line of sub-text under the name, left-aligned with it. `/collection` puts the printing's
   * `SET · rarity` here. It rode the meta line's right end until the card marks arrived, and
   * then a chip plus three or four glyphs pushed it past the tile's edge. Under the name it
   * has a line of its own and nothing competes for it.
   */
  nameSub?: ReactNode;
  /** The full-height right column. The deck tile's `✕`. */
  trailing?: ReactNode;
  /**
   * Phone-only side padding at 7px instead of 9 (collection surfaces, Call 3). The 3-up grid's
   * 115.3/105.3px tile has no room for the wider gutter; `md:` is untouched, since the shrink is
   * a phone-width concession and the desktop tile floor (178px) never needs it.
   */
  compact?: boolean;
}) {
  return (
    /* The draft's accent edge is NOT here. It was, and it ran only the
       caption's 46px, where it was easy to miss; the deck tile draws it down
       the whole shell now, the way `decklist-row.tsx` draws it down a whole
       row. `/collection` has no draft at all, so nothing here needs the prop. */
    <div className={`flex items-stretch ${nameSub ? CARD_TILE_CAPTION_SUB_H : CARD_TILE_CAPTION_H}`}>
      <div
        className={`flex-auto min-w-0 flex flex-col justify-center gap-[3px] py-[8px] md:py-[6px] ${
          compact ? "pl-[7px]" : "pl-[9px]"
        } md:pl-[10px] ${
          trailing ? "pr-[3px]" : compact ? "pr-[7px] md:pr-[10px]" : "pr-[9px] md:pr-[10px]"
        }`}
      >
        {/* The meta line sits ABOVE the name: the marks qualify the picture, so
            they sit against it, and the name then closes the tile — which keeps
            six names in a row on one line instead of letting each card's marks
            push its own name around. */}
        <div
          className={`flex items-center gap-[6px] min-w-0 font-mono text-[9px] md:text-[9.5px] leading-none ${META_LINE}`}
        >
          {meta}
        </div>
        {/* The name line carries a line-height, where the meta line above it
            takes `leading-none`. `truncate` means `overflow: hidden`, so at
            `line-height: 1` the span's content box is exactly its font-size and
            every descender — the `g` in `Along the Crooked Way` — is clipped at
            the baseline. Both values sit within each width's fixed box (16px in
            a 20px line, 17px in a 17px line), so the caption's height sum is
            untouched.

            The span then pays 2px of vertical padding and takes it straight
            back as a negative margin. The padding box is what `overflow: hidden`
            clips, so that buys the ink 2px of slack above and below; the margin
            box is what the flex line measures, so nothing moves. Desktop is why:
            17px of line for a 13px face is 1.31em, and a face in the fallback
            chain — or Plex Sans itself before `display: swap` resolves — whose
            ascent and descent exceed that would clip the very `g` this fixes,
            with the phone's 1.33em absorbing what desktop could not. */}
        <div className={`flex items-center gap-[6px] min-w-0 leading-[16px] md:leading-[17px] ${NAME_LINE}`}>
          <span
            aria-hidden={nameHidden || undefined}
            className="min-w-0 truncate py-[2px] -my-[2px] text-[12px] md:text-[13px] font-semibold"
            style={{ color: "var(--fg)" }}
          >
            {name}
          </span>
          {nameSpoken}
          {nameTrail}
        </div>
        {nameSub && (
          <div
            data-testid="tile-sub"
            className={`min-w-0 truncate font-mono text-[9px] md:text-[9.5px] leading-none ${SUB_LINE}`}
            style={{ color: "var(--fg-faint)" }}
          >
            {nameSub}
          </div>
        )}
      </div>
      {trailing}
    </div>
  );
}
