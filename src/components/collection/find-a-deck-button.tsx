"use client";
// The labelled Find a deck button the collection draws beside each card while the list is narrowed to Free alone
// (tool discovery call 1, `Find.dc.html` F1 and R4). A sibling of the tile or row, never nested in it: both are
// buttons. It opens the card window straight on the shipped Find a deck view.

import { FitsGlyph } from "../cards/fits-glyph";
import { findADeckCopy as copy } from "../../lib/copy/find-a-deck";
import type { FindADeckFrom } from "../../lib/analytics/tool-events";

const RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

/** What a view needs to draw the buttons: the cards that take none, and the press. */
export type FindADeckButtons = {
  /** Not Commander-legal: the door would refuse it, so no button draws. */
  illegal: ReadonlySet<string>;
  onPress: (oracleId: string, opener: HTMLElement, place: FindADeckPlace) => void;
};

/**
 * Where it sits, each as drawn:
 * - `tile`: under a grid tile, full tile width, 36px on a phone and 34px from md, 6px under the tile.
 * - `strip`: under a phone row, inside its outline: 40px, a `--border` hairline above, bottom corners rounded 7.
 * - `side`: beside a row from md, the row's height, 136px.
 */
export type FindADeckPlace = "tile" | "strip" | "side";

/** The event's `from` for each place (plan §6). */
export const FIND_A_DECK_FROM_PLACE = { tile: "tile_button", strip: "row_strip", side: "row_button" } as const satisfies Record<
  FindADeckPlace,
  FindADeckFrom
>;

const PLACE: Record<FindADeckPlace, string> = {
  tile: "w-full h-[36px] md:h-[34px] rounded-[8px] [border:1px_solid_var(--border-strong)] hover:[border-color:var(--accent)]",
  strip:
    // The row keeps its own bottom border, squared on a phone, and that border is the strip's hairline.
    "md:hidden w-full h-[40px] rounded-b-[7px] border border-t-0 border-solid border-[color:var(--border)] hover:bg-[color:var(--surface-raised)]",
  side: "hidden md:flex w-[136px] flex-none self-stretch rounded-[7px] [border:1px_solid_var(--border-strong)] hover:[border-color:var(--accent)]",
};

export function FindADeckButton({
  place,
  cardName,
  onPress,
}: {
  place: FindADeckPlace;
  /** The card's printed name, for the accessible name: the visible word is the same on every card. */
  cardName: string;
  onPress: (opener: HTMLElement) => void;
}) {
  return (
    <button
      type="button"
      data-find-a-deck={place}
      aria-label={copy.buttonAria(cardName)}
      onClick={(e) => onPress(e.currentTarget)}
      className={`flex cursor-pointer items-center justify-center gap-[8px] bg-[color:var(--surface)] p-0 font-sans text-[12.5px] font-semibold text-[color:var(--fg)] transition-colors ${PLACE[place]} ${RING}`}
    >
      <FitsGlyph />
      <span>{copy.button}</span>
    </button>
  );
}
