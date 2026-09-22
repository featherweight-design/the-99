import { CARD_FACT_MARK_PX } from "./card-fact-mark";

/**
 * Drawn up — tutors, as a glyph. The fifth fact mark, and the only one no bracket rule counts.
 *
 * SOLID, because a tutor is a card on a list: the verdict handoff draws a card on a list solid and
 * a behavior that loops stroked, and the lemniscate is the stroked one. The arrow
 * rises off a baseline — a card lifted out of the library.
 *
 * THE PATHS ARE THE CANVAS'S OWN, lifted verbatim from `The 99 - The Verdict.dc.html` §4a, where
 * they appear on every tutor tile and row. `combo-glyph.tsx` records what hand-authoring a glyph
 * from its prose description cost: a pretzel where a figure eight was drawn.
 *
 * Same ink, glow and one size as every other fact mark.
 */
const GLOW = "drop-shadow(0 0 3px color-mix(in oklab, var(--fact) 45%, transparent))";

export function TutorGlyph() {
  return (
    <svg
      width={CARD_FACT_MARK_PX}
      height={CARD_FACT_MARK_PX}
      viewBox="0 0 16 16"
      className="block shrink-0"
      style={{ color: "var(--fact)", filter: GLOW }}
      // ALWAYS HIDDEN, as the lemniscate is: every surface that draws it writes "Tutors" beside it.
      aria-hidden
      data-testid="tutor-glyph"
    >
      <path d="M1.8 12.2 H14.2 V14.4 H1.8 Z" fill="currentColor" />
      <path d="M8 1.3 L11.7 5.7 H9.2 V10.3 H6.8 V5.7 H4.3 Z" fill="currentColor" />
    </svg>
  );
}
