/**
 * The lemniscate — a two-card combo, as a glyph.
 *
 * ROUND 2 OWNS THIS SHAPE. Its handoff draws it as a card FACT ("this card is a combo piece"),
 * which is a different statement from this round's clause ("this card completes a combo with
 * X") even though both draw the same figure. It is in its own module rather than added to
 * `CARD_FACTS` for exactly that reason: the fact vocabulary, its fixed order and its key entry
 * are Round 2's surface, and a fourth member added from here would change all three.
 *
 * Drawn to the spec in `STATES-combo-awareness.md` — stroked, 16px viewBox, `stroke-width 1.8`,
 * `linecap round` — so that when Round 2 ships its own it is the same figure and this module
 * becomes a re-export rather than a second drawing.
 *
 * The glow sits OUTSIDE the box model, as Round 1's marks do: it costs no layout, so no row and
 * no caption grows for it.
 */
const GLOW = "drop-shadow(0 0 2px color-mix(in srgb, var(--fact) 45%, transparent))";

/** 12px on every host; the modal block draws it at 16. */
export const COMBO_GLYPH_PX = 12;

export function ComboGlyph({ size = COMBO_GLYPH_PX }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      // `block` so the glyph does not sit on the text baseline and lift the line box.
      className="block shrink-0"
      style={{ color: "var(--fact)", filter: GLOW }}
      // ALWAYS HIDDEN. The clause is inert and never a target; what a screen reader hears is
      // the sentence, composed into the host's own accessible name so it is spoken once and
      // in the order that surface chose.
      aria-hidden
      data-testid="combo-glyph"
    >
      <path
        d="M4.2 8 A 2.3 2.3 0 1 1 6.5 8 A 2.3 2.3 0 1 0 11.1 8 A 2.3 2.3 0 1 1 8.8 8 A 2.3 2.3 0 1 0 4.2 8 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
