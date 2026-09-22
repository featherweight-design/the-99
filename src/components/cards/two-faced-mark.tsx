import { twMerge } from "tailwind-merge";
import { isTwoFaced } from "../../lib/cards/faces";
import { twoFacedCopy } from "../../lib/copy/card-surfaces";

/**
 * The `//` after a two-faced card's name, at the decklist row and the card
 * tile (#363). Design declined a corner glyph: a row has no corners, the tile's
 * are allocated, and any invented mark at this scale would be a 7–9px shape
 * sitting beside a 7px ownership dot meaning something unrelated. `//` is
 * typographic, so it cannot be confused with a dot at any size, and it is the
 * card's own name punctuation abbreviated rather than a badge about the card.
 *
 * Renders nothing when the layout is not one of the two-sided ones, including
 * when it is absent — a missing mark, never one promising a flip the modal
 * cannot deliver. See `lib/cards/faces.ts`.
 *
 * ORACLE-LEVEL ON PURPOSE, and no longer in step with the modal's turn control,
 * which also opens on a PRINTING's own back art (a reversible Secret Lair, whose
 * oracle layout reads one-sided). That divergence is the intended reading rather
 * than a gap to close: this mark says the CARD turns over in play, and a printing
 * cannot change what a card does — both sides of `sld/2214` are the same one-faced
 * enchantment, and `tdm/381`'s two halves are one object at the table. A reader
 * would take a mark here as a rules fact about the card, so it stays keyed to the
 * layout word. The modal's control is about seeing the other ART and says so.
 *
 * Its callers could not do otherwise today in any case: `decklist-row` and
 * `deck-card-tile` are handed `layout` and no printing-level back image.
 *
 * Sits OUTSIDE the name's `CardDetailTrigger` at both call sites: the trigger's
 * `aria-label` replaces everything nested under it, so the sr-only half would
 * be spoken nowhere from in there.
 */
export function TwoFacedMark({
  layout,
  className,
}: {
  layout?: string | null;
  className?: string;
}) {
  if (!isTwoFaced(layout)) return null;
  return (
    <span className={twMerge("flex-none font-mono text-[11px] leading-none", className)}>
      <span aria-hidden style={{ color: "var(--fg-faint)" }}>
        {twoFacedCopy.mark}
      </span>
      <span className="sr-only">{twoFacedCopy.markAria}</span>
    </span>
  );
}
