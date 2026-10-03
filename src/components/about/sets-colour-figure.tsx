"use client";

// The `sets` figure's colour control, and it has to be a client module for the reason
// `browse-figure.tsx` gives: `ColourControl` takes handlers, and a fixture built on the
// server would hand a FUNCTION across the boundary, which React refuses outright.
//
// The control is the live row's own (H10): the commander rack's pips with the `Any` /
// `Exactly` modifier inside the same box. The figure drew five bare pips until then, which
// was a picture of the row before the modifier joined it.

import { ColourControl } from "../commanders/rack/colour-control";

// Inert, like every specimen: `Specimen` sets `pointer-events: none` over the whole figure,
// so neither is ever called. They exist because the types require them.
const noop = () => {};

export function SetsColourFigure() {
  return (
    <span className="flex flex-none">
      <ColourControl wide colors={[]} match="contains" onColorsChange={noop} onMatchChange={noop} />
    </span>
  );
}
