// The /decks tile's art band and the identity block on it (deck name, commander, colour), drawn by the owner's tile
// (`deck-card.tsx`, with its ⋯ as children) and a friend's tile (`friend-decks-tab.tsx`, with nothing), so the two are
// one band rather than a copy (friend decks handoff, call 6).
import type { ReactNode } from "react";
import { ArtWash, INK_SHADOW } from "../ui/art-wash";

export function DeckTileArt({
  artCropUri,
  colorIdentity,
  name,
  commanderName,
  partnerName,
  colour,
  deferArt = false,
  commanderHidden = false,
  children,
}: {
  artCropUri: string | null;
  colorIdentity: string[];
  name: string;
  /** The commander as the tile names it (the printed name of the copy the art is from, on the owner's tile). */
  commanderName: string;
  partnerName: string | null;
  /** The worded colour of the deck's whole identity. */
  colour: string;
  deferArt?: boolean;
  /** The deck's name already says the commander, so the line keeps the colour alone (`commanderRepeats`). */
  commanderHidden?: boolean;
  /** Drawn over the band, as the owner's ⋯ is. */
  children?: ReactNode;
}) {
  return (
      <div
        data-deck-art
        // `shrink-0`: the tile is a flex column now, and a band that gave way
        // would trade the art for the slack the footer is meant to take.
        className="relative h-[168px] shrink-0 overflow-hidden @min-[330px]:h-[248px]"
      >
        {/* Two bands, one shown by the tile's own container query, because the
            cell band has a FLOOR the handoff states — never in a column under
            ~330px — and three columns do not give it one until about 1062px of
            viewport: the grid's 22px padding and two 14px gaps take 72px, so a
            cell is 189px at 640 and 456px at 1440. A single 248px band would
            draw a 0.76:1 portrait sliver across that whole range.

            Below the floor the resume band takes over, which at a 230px cell is
            within a hair of the crop's own 1.37:1. The remaining problem at the
            narrow end is the grid's — three columns at 640px is a 102px card
            whatever it draws — and `decks-view.tsx` belongs to another round.

            `labelAtPx` is the same either way: the block is the block whatever
            the band, which is exactly what a px figure means. */}
        <div className="@min-[330px]:hidden">
          <ArtWash
            strategy="cover"
            height={168}
            labelAtPx={46}
            artCropUri={artCropUri}
            colorIdentity={colorIdentity}
            deferArt={deferArt}
          />
        </div>
        <div className="hidden @min-[330px]:block">
          <ArtWash
            strategy="cover"
            height={248}
            // The block's measured height in pixels from the foot: 10px bottom
            // inset, a 10.5px meta line at 13, a 4px gap and a 17px name at 1.15
            // for 20. The chip is NOT in this block — it moved to the progress
            // row, which is what drops this figure from 78 and turns 32px of
            // darkness back into art.
            labelAtPx={46}
            artCropUri={artCropUri}
            colorIdentity={colorIdentity}
            deferArt={deferArt}
          />
        </div>
        {children}
        {/* The block at the foot, carrying identity alone: the deck's name, its
            commander and its colour. The chip and the bar are both statements
            about progress and they now sit together below the divider, which is
            what leaves this block with one job. The right padding clears the
            overflow control's 44px target in the same corner. */}
        <div
          // The hook a probe measures the ramp against. This block IS the ink,
          // so its own box is the measurement — unlike the row bands, whose
          // breakpoint wrappers span the whole band.
          data-wash-label
          // Presentation. The overlay link's own `aria-label` states these words
          // in order, so leaving them exposed announced the tile's identity
          // twice — once from this block and again from the link. Nothing here
          // is focusable, which is what makes hiding it safe; the overflow
          // control sits outside this block and stays exposed.
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 min-w-0 pb-[10px] pr-[56px] pl-[13px] sm:pr-[48px]"
        >
          <h3
            className="truncate font-display text-[17px] font-semibold sm:text-[15px]"
            style={{ color: "var(--fg)", lineHeight: 1.15, textShadow: INK_SHADOW }}
          >
            {name}
          </h3>
          {/* Two spans, not one truncating string. The colour is the half that
              survives at a 189px column — it is what the pips came off FOR — and
              one `truncate` across both clips it away for any ordinary commander
              name, which would have removed the pips and put nothing in their
              place. The name gives; the colour does not.

              Stated leading on the row, like the name above it: `labelAtPx` is
              this block's measured height, and a line box inheriting the app's
              1.5 would make that figure move whenever the body leading did. */}
          <span
            className="mt-[4px] flex min-w-0 gap-[4px] font-mono text-[10.5px]"
            style={{ lineHeight: 1.25, color: "var(--fg-body)", textShadow: INK_SHADOW }}
          >
            {/* Both commanders, with the `+` the spines use. The accessible
                name already named the pair, so printing one of them left a
                sighted reader with a different deck identity than a screen
                reader got — on a pair deck, the wrong one. */}
            {commanderHidden ? null : partnerName ? (
                // Two spans with the joiner between them, never one string: a
                // single `truncate` ellipsises the END of the primary name, so a
                // narrow cell printed `Ishai, Ojutai…` and lost both the `+` and
                // the partner — the two things that say *pair*. The partner takes
                // the larger shrink factor, so it is the half that gives, which is
                // the same ordered shrink the resume row and the spines use.
                <span className="flex min-w-0 gap-[4px]">
                  <span className="min-w-0 truncate">{commanderName}</span>
                  <span className="flex-none">+</span>
                  <span className="min-w-0 truncate" style={{ flexShrink: 1000 }}>
                    {partnerName}
                  </span>
                </span>
              ) : (
                <span className="min-w-0 truncate">{commanderName}</span>
              )}
            <span className="flex-none whitespace-nowrap">{commanderHidden ? colour : `· ${colour}`}</span>
          </span>
        </div>
      </div>
  );
}
