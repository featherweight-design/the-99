/**
 * The lemniscate — a two-card combo, as a glyph.
 *
 * ROUND 2 OWNS THIS SHAPE. Its handoff draws it as a card FACT ("this card is a combo piece"),
 * which is a different statement from this round's clause ("this card completes a combo with
 * X") even though both draw the same figure. It is in its own module rather than added to
 * `CARD_FACTS` for exactly that reason: the fact vocabulary, its fixed order and its key entry
 * are Round 2's surface, and a fourth member added from here would change all three.
 *
 * THE PATH IS THE CANVAS'S OWN, lifted verbatim from `The 99 - Combo Awareness.dc.html`,
 * where it appears seven times — so when Round 2 ships its own it is the same figure and this
 * module becomes a re-export rather than a second drawing.
 *
 * The first version was hand-authored from the prose spec in `STATES-combo-awareness.md`
 * ("stroked, 16px viewBox, `stroke-width 1.8`, `linecap round`") without checking whether the
 * canvas carried a path. It did. Four arcs with the wrong sweep flags drew a pretzel — two
 * discs fused at the middle rather than a figure eight — which is what shipped.
 *
 * A prose spec describes a glyph; it does not define one. Read the canvas.
 *
 * The glow sits OUTSIDE the box model, as Round 1's marks do: it costs no layout, so no row and
 * no caption grows for it.
 */
// The canvas's own value, including its 3px radius and its `oklab` interpolation. The first
// version of this file guessed 2px in srgb and was wrong about both.
const GLOW = "drop-shadow(0 0 3px color-mix(in oklab, var(--fact) 45%, transparent))";

/**
 * 12px on every host; the modal block draws it at 16.
 *
 * DELIBERATELY NOT `CARD_FACT_MARK_PX` (16). Round 1's marks sit on a name line at 16 and
 * this clause leads a SECONDARY line of 9.5–10.5px mono, where a 16px glyph is taller than
 * the text it introduces. `STATES-combo-awareness.md` sets both figures by name — "glyph
 * size: 12px on every host. 16px in the modal block" — so the two sizes are the spec rather
 * than drift from it, and the modal's own 16 is why this is a parameter at all.
 */
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
        // LIFTED VERBATIM from the handoff's canvas, where it appears seven times. Two arcs
        // joined by cubic curves, which is what makes the crossing read as a crossing.
        d="M5.2 4.9 A 3.1 3.1 0 1 0 5.2 11.1 C 8.3 11.1 7.7 4.9 10.8 4.9 A 3.1 3.1 0 1 1 10.8 11.1 C 7.7 11.1 8.3 4.9 5.2 4.9 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
