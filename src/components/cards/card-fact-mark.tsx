// CardFactMark — one glyph for one standing fact about a card: Game Changer, mass
// land denial, extra turns, or (since 2026-09-22) tutor. Drawn wherever a card already appears.
//
// Handoff: design/design_handoff_the99_card_mark (R1).
//
// THREE SUBJECTS, THREE SILHOUETTES — sky, ground, time; jagged, low-and-wide,
// round. The set is told apart BEFORE it is read, which is the property three
// letters in identical boxes could not have.
//
// ONE INK FOR THE CLASS, NOT THREE. `--fact` says *a bracket fact is present*; the
// glyph says which one, so colour is never the only carrier. It is not `--fg`
// because at 13px on a name line `--fg` IS the card-name colour, so the mark would
// join the title instead of annotating it.
//
// It is theme-INDEPENDENT, which the WUBRG pips are ALMOST but not quite (Canopy
// shifts --g off its own green accent), so `--fact` is pinned across the six by a
// test rather than by resemblance to them.
//
// THE HANDOFF'S "cool against warm status inks" ARGUMENT HOLDS FOR THE STATUS INKS
// AND NOT FOR EVERY ACCENT, measured on the build: --warning, --danger and
// --avail-over-fg are warm in all six themes, but --accent is COOL in two. Against
// --fact, kaldheim's accent sits about 6° away in hue and phyrexia's about 41° —
// the first well inside the 20° floor this repo's theme contract applies to the one
// pair it guards. So on those two themes colour alone does not separate this mark
// from a draft-touched one, and the separation that carries is the same one that
// distinguishes it from the bracket mark: this glyph is BARE and every neighbour is
// contained. That is why the no-container rule is semantic rather than stylistic,
// and why nothing here may start drawing a box.
//
// Whether `--fact` should move off that hue is a DESIGN call, not one to settle in a
// comment; it is recorded in the handoff's verdict rather than resolved here.
//
// MASS, NOT OUTLINE — a legibility decision at 12px, and what makes the glow work:
// a filled silhouette throws the halo outward off a clean edge where an outline
// glyph scatters it through its own gaps and reads as blur. The rule is NO
// HAIRLINES AND NO OUTLINE-ONLY GLYPH rather than "no strokes at all": the
// turn-again arc is a 2px stroke closed by a filled head, because a solid disc
// cannot say "the round comes back around", and mass land denial's growth marks
// are strokes lifted off the peak. Both are stated exceptions (verdict erratum 9).
//
// ONE SIZE — 16x16, on every surface, and not a prop. NOTHING takes the mark's place
// and nothing shrinks it: a numeral survives shrinking, a glyph does not, so the rule
// the old 12px floor protected is now kept by there being nothing to shrink.
//
// NO TOOLTIP HERE, AND NOT BECAUSE IT IS UNBUILT. `FactTooltip` wraps this glyph on
// every surface that draws it, because the hover needs a positioned element and an open
// delay — a SURFACE concern, not a prop on a glyph. Wrapping rather than nesting is also
// what keeps the two rules apart: the tooltip is pointer-fine and optional, this mark is
// neither. Reach for `FactTooltip` when adding a new mount; a mark drawn bare is the
// defect reported on /collection on 2026-09-19.
//
// ABSENCE IS THE DESIGN. A card with no facts renders nothing and reserves nothing.
// There is no positive claim at any size, because detection on two of the three is
// measured and PARTIAL — a drawn absence would read as a cleared check when it is
// only silence.

"use client";

import { type CardFact, cardFactName } from "../../lib/copy/card-mark";

/**
 * ONE SIZE, EVERYWHERE. The mark is 16x16 on every surface that draws it, and the
 * size is not a prop — a per-mount figure is a per-mount drift, and the set shipped
 * at 12, 13, 14 and 16 across six mounts, so the same fact read as a different mark
 * depending on which list a player was looking at. Ruled by Hugh, 2026-09-21.
 *
 * This supersedes the handoff's 12px floor, which existed so a dense surface could
 * shrink the glyph rather than withhold it. Nothing shrinks it now, so nothing
 * reaches the floor: the rule it protected — no dot, no dash, no initial in the
 * mark's place — is kept by there being one size to keep.
 */
export const CARD_FACT_MARK_PX = 16;

/** The glow sits OUTSIDE the box model: it costs no layout and grows no row. */
const GLOW = "drop-shadow(0 0 3px color-mix(in srgb, var(--fact) 45%, transparent))";

/**
 * Drawn up — the tutor's paths, lifted verbatim from `The 99 - The Verdict.dc.html` §4a. They
 * live HERE, beside the other marks, and `TutorGlyph` draws them too, so the finding's mark and
 * the card's mark are one drawing rather than two copies that agree today.
 */
export function TutorPaths() {
  return (
    <>
      <path d="M1.8 12.2 H14.2 V14.4 H1.8 Z" fill="currentColor" />
      <path d="M8 1.3 L11.7 5.7 H9.2 V10.3 H6.8 V5.7 H4.3 Z" fill="currentColor" />
    </>
  );
}

function Glyph({ fact }: { fact: CardFact }) {
  if (fact === "tutor") return <TutorPaths />;
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
  /**
   * Set where the SURFACE composes its own accessible name — /collection's row
   * (explicit aria-label) and tile (text content) — so the fact is spoken once, in
   * the place that surface put it, rather than twice in the wrong order.
   */
  silent = false,
}: {
  fact: CardFact;
  silent?: boolean;
}) {
  const name = cardFactName(fact);
  return (
    <svg
      width={CARD_FACT_MARK_PX}
      height={CARD_FACT_MARK_PX}
      viewBox="0 0 16 16"
      // `block` so the glyph does not sit on the text baseline and lift the line box:
      // no row and no caption may grow for this mark.
      className="block shrink-0"
      style={{ color: "var(--fact)", filter: GLOW }}
      role={silent ? undefined : "img"}
      aria-hidden={silent ? true : undefined}
      aria-label={silent ? undefined : name}
      data-testid={`card-fact-${fact}`}
    >
      <Glyph fact={fact} />
    </svg>
  );
}
