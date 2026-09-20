// CardFactMark — one glyph for one standing fact about a card: Game Changer, mass
// land denial, or extra turns. Drawn wherever a card already appears.
//
// Handoff: design/design_handoff_the99_card_mark (R1).
//
// THREE SUBJECTS, THREE SILHOUETTES — sky, ground, time; jagged, low-and-wide,
// round. The set is told apart BEFORE it is read, which is the property three
// letters in identical boxes could not have.
//
// ONE INK FOR THE CLASS, NOT THREE. `--fact` says *a bracket fact is present*; the
// glyph says which one, so colour is never the only carrier. It is cool because
// every status ink on these surfaces is warm (--warning to buy, --avail-over-fg
// over-committed, --accent draft-touched, --danger short), and it is not `--fg`
// because at 13px on a name line `--fg` IS the card-name colour, so the mark would
// join the title instead of annotating it.
//
// MASS, NOT OUTLINE — a legibility decision at 12px, and what makes the glow work:
// a filled silhouette throws the halo outward off a clean edge where an outline
// glyph scatters it through its own gaps and reads as blur. The rule is NO
// HAIRLINES AND NO OUTLINE-ONLY GLYPH rather than "no strokes at all": the
// turn-again arc is a 2px stroke closed by a filled head, because a solid disc
// cannot say "the round comes back around", and mass land denial's growth marks
// are strokes lifted off the peak. Both are stated exceptions (verdict erratum 9).
//
// 12PX IS THE FLOOR, and NOTHING takes the mark's place below it — no dot, no dash,
// no initial. Same shape of rule as the bracket mark's 20px floor, reached from the
// other direction: a numeral survives shrinking, a glyph past its floor does not.
//
// ABSENCE IS THE DESIGN. A card with no facts renders nothing and reserves nothing.
// There is no positive claim at any size, because detection on two of the three is
// measured and PARTIAL — a drawn absence would read as a cleared check when it is
// only silence.

"use client";

import { type CardFact, cardFactName } from "../../lib/copy/card-mark";

/** Below this the mark is not drawn and nothing is substituted. */
export const CARD_FACT_MARK_FLOOR_PX = 12;

/** The glow sits OUTSIDE the box model: it costs no layout and grows no row. */
const GLOW = "drop-shadow(0 0 3px color-mix(in srgb, var(--fact) 45%, transparent))";

function Glyph({ fact }: { fact: CardFact }) {
  if (fact === "gameChanger") {
    // Bolt — force arriving from outside the board.
    return <path d="M9.4 1.5 L4.1 8.8 H7.3 L6.6 14.5 L11.9 7.0 H8.7 Z" fill="currentColor" />;
  }
  if (fact === "massLandDenial") {
    // Peak, stripped — a solid mountain with the growth marks lifted off above it.
    return (
      <>
        <path d="M1.4 13.4 L6.2 5.2 L9.4 10.6 L11.2 7.8 L14.6 13.4 Z" fill="currentColor" />
        <path
          d="M4.4 2.6 L5.6 2.6 M8.0 1.6 L8.0 3.0 M11.0 2.8 L12.2 2.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </>
    );
  }
  // Turn again — a near-closed circle with a solid arrowhead.
  return (
    <>
      <path
        d="M10.98 3.74 A 5.2 5.2 0 1 1 6.65 2.98"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M9.0 2.4 L7.1 4.6 L6.2 1.3 Z" fill="currentColor" />
    </>
  );
}

export function CardFactMark({
  fact,
  size,
  /**
   * Set where the SURFACE composes its own accessible name — /collection's row
   * (explicit aria-label) and tile (text content) — so the fact is spoken once, in
   * the place that surface put it, rather than twice in the wrong order.
   */
  silent = false,
  title,
}: {
  fact: CardFact;
  size: number;
  silent?: boolean;
  /** The tooltip sentence, when the caller is drawing one. Never a native `title`. */
  title?: string;
}) {
  if (size < CARD_FACT_MARK_FLOOR_PX) return null;
  const name = cardFactName(fact);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      // `block` so the glyph does not sit on the text baseline and lift the line box:
      // no row and no caption may grow for this mark.
      className="block shrink-0"
      style={{ color: "var(--fact)", filter: GLOW }}
      role={silent ? undefined : "img"}
      aria-hidden={silent ? true : undefined}
      aria-label={silent ? undefined : name}
      data-testid={`card-fact-${fact}`}
      data-fact-title={title}
    >
      <Glyph fact={fact} />
    </svg>
  );
}
