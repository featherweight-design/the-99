// FoilMark: the glint that says "every copy of this printing you own is foil" (foil handoff addendum M1, R4).
//
// A four-point star, solid, no outline, no glow, no motion: the card-mark family's form rules, so it is bare, a solid
// mass and absent when it has nothing to say. Its ink is the film's own colours as a 135° gradient, ONE ink for foil
// and etched (R4: at 12px the silver glint was not told apart from the rainbow, and etched is a foil finish). The film
// over a tile's art stays silver for etched; the tooltip and the spoken name still say "etched foil".
//
// 12px everywhere, `flex-none` and never dropped: where a deck tile's meta line overflows, the fact marks drop whole
// first and the glint never does. It sits beside the ownership indicator, so it reads with "you own this" and never
// among the Game Changer and tutor marks. Forced colours: `fill: CanvasText` (globals.css `.foil-glint`).
//
// The tooltip is `FactTooltip` wrapping this glyph on the surface that draws it, as it is for `CardFactMark`: pointer-fine,
// an enhancement only, never the gloss. Part-foil, no foil and not-owned draw NOTHING (the caller passes no finish).

"use client";

import { useId } from "react";

import type { FoilFinish } from "../../lib/collection/browse";
import { foilMarkCopy } from "../../lib/copy/foil-mark";
import { FactTooltip } from "./fact-tooltip";

/** 12px on every surface, and not a prop: a per-mount size is a per-mount drift (the fact mark's own rule). */
export const FOIL_MARK_PX = 12;

/** The handoff's path, viewBox 16. */
const PATH = "M8 .5C9.2 4.9 11.1 6.8 15.5 8C11.1 9.2 9.2 11.1 8 15.5C6.8 11.1 4.9 9.2 .5 8C4.9 6.8 6.8 4.9 8 .5Z";

export function FoilMark({
  finish,
  /**
   * Set where the SURFACE composes its own accessible name (a tile's text content, a row's explicit `aria-label`), so the
   * finish is spoken once, in the place that surface put it.
   */
  silent = false,
}: {
  finish: FoilFinish;
  silent?: boolean;
}) {
  // `useId` carries colons, which a `url(#…)` reference does not need to meet.
  const gradient = `foil-glint-${useId().replace(/:/g, "")}`;
  const name = foilMarkCopy.name[finish];
  return (
    <svg
      width={FOIL_MARK_PX}
      height={FOIL_MARK_PX}
      viewBox="0 0 16 16"
      // `block` so the glyph does not sit on the text baseline and lift the line box: no row may grow for this mark.
      className="foil-glint block shrink-0 flex-none"
      role={silent ? undefined : "img"}
      aria-hidden={silent ? true : undefined}
      aria-label={silent ? undefined : name}
      data-testid="foil-mark"
      data-finish={finish}
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="24%" stopColor="var(--foil-glint-a)" />
          <stop offset="38%" stopColor="var(--foil-glint-b)" />
          <stop offset="50%" stopColor="var(--foil-glint-c)" />
          <stop offset="62%" stopColor="var(--foil-glint-d)" />
          <stop offset="76%" stopColor="var(--foil-glint-e)" />
        </linearGradient>
      </defs>
      <path d={PATH} fill={`url(#${gradient})`} />
    </svg>
  );
}

/**
 * The glint a surface draws: the mark inside the fact tooltip's chrome (pointer-fine, 400ms in, instant out), with the
 * sentence for its finish. `precon` swaps in the box's own words, for a precon's copies are never the player's.
 */
export function FoilGlint({
  finish,
  silent = true,
  precon,
}: {
  finish: FoilFinish;
  silent?: boolean;
  /** A precon tile or row: how many copies of this card the box holds, which picks `this deck's copy` or `copies`. */
  precon?: { quantity: number };
}) {
  const sentence = precon
    ? precon.quantity > 1 ? foilMarkCopy.tooltip.preconMany : foilMarkCopy.tooltip.preconOne
    : foilMarkCopy.tooltip[finish];
  return (
    <FactTooltip sentence={sentence}>
      <FoilMark finish={finish} silent={silent} />
    </FactTooltip>
  );
}
