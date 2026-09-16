// The caption under a card tile's art, on `/collection` and `/decks/[id]`.
//
// Design handoff `card_captions` (R1), call A: two lines, always, at a fixed
// height. The meta line carries the marks that used to sit on the illustration;
// the name line closes the tile. A trailing column — the deck tile's `✕` — is
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

/** Draws an occupant's edge inside its box instead of around it. */
export function slotOutline(colour: string, dashed = false) {
  return {
    outline: `1px ${dashed ? "dashed" : "solid"} ${colour}`,
    outlineOffset: "-1px",
  } as const;
}

export function CardTileCaption({
  meta,
  metaTrail,
  name,
  nameHidden = false,
  nameSpoken,
  nameTrail,
  trailing,
}: {
  /** The meta line's left group, in order: dot, slot, count. */
  meta?: ReactNode;
  /** Right-aligned on the meta line. `SET · rarity` on `/collection`. */
  metaTrail?: ReactNode;
  /** The printed front-face name. Truncation is this component's. */
  name: ReactNode;
  /**
   * Hide the drawn name from assistive tech. `/collection`'s tile is one
   * `<button>` whose accessible name is its text content, so the clipped
   * caption is hidden and the whole name spoken from `nameSpoken` instead.
   */
  nameHidden?: boolean;
  nameSpoken?: ReactNode;
  /** The `//` mark. Never on `/collection` — spec errata 3. */
  nameTrail?: ReactNode;
  /** The full-height right column. The deck tile's `✕`. */
  trailing?: ReactNode;
}) {
  return (
    /* The draft's accent edge is NOT here. It was, and it ran only the
       caption's 46px, where it was easy to miss; the deck tile draws it down
       the whole shell now, the way `decklist-row.tsx` draws it down a whole
       row. `/collection` has no draft at all, so nothing here needs the prop. */
    <div className={`flex items-stretch ${CARD_TILE_CAPTION_H}`}>
      <div
        className={`flex-auto min-w-0 flex flex-col justify-center gap-[3px] py-[8px] md:py-[6px] pl-[9px] md:pl-[10px] ${
          trailing ? "pr-[3px]" : "pr-[9px] md:pr-[10px]"
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
          {metaTrail && <span className="ml-auto flex-none">{metaTrail}</span>}
        </div>
        {/* The name line carries a line-height, where the meta line above it
            takes `leading-none`. `truncate` means `overflow: hidden`, so at
            `line-height: 1` the span's content box is exactly its font-size and
            every descender — the `g` in `Along the Crooked Way` — is clipped at
            the baseline. The values sit inside each width's fixed box (16px in
            a 20px line, 17px in a 17px line), so nothing moves. */}
        <div className={`flex items-center gap-[6px] min-w-0 leading-[16px] md:leading-[17px] ${NAME_LINE}`}>
          <span
            aria-hidden={nameHidden || undefined}
            className="min-w-0 truncate text-[12px] md:text-[13px] font-semibold"
            style={{ color: "var(--fg)" }}
          >
            {name}
          </span>
          {nameSpoken}
          {nameTrail}
        </div>
      </div>
      {trailing}
    </div>
  );
}
