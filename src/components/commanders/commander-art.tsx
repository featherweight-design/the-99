// The row's colour identity, shared by the owned lane's `RecCard` and
// discovery's row. Both draw the same shape from the same field, so it lives
// here rather than being copied into the second row and left to drift.
//
// The art behind these rows is `<ArtWash strategy="left-portrait">`; the band
// this file used to draw was a wide crop faded under the text, which read as
// texture rather than as a commander.

import { WUBRG_COLOR } from "../../lib/collection/browse";

/**
 * The WUBRG identity, beside the name on both lanes. It used to sit along the
 * bottom of the tile; with the tile gone it moves to the one other place the
 * design draws it, rather than being dropped with the frame that carried it.
 *
 * Decorative: the row's accessible name leads with the commander's name, and
 * the colour identity is not a fact the name is incomplete without.
 */
export function IdentityPips({
  colorIdentity,
  size = 8,
  gap = 3,
}: {
  colorIdentity: string[];
  size?: number;
  gap?: number;
}) {
  if (colorIdentity.length === 0) return null;
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center" style={{ gap }}>
      {colorIdentity.map((color) => (
        <span
          key={color}
          // Squared off, which is what separates an identity read from the round
          // mana pips a cost is drawn with: five of these in a row are a colour
          // identity, not a five-mana cost.
          className="block shrink-0 rounded-[2px]"
          style={{
            width: size,
            height: size,
            background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
          }}
        />
      ))}
    </span>
  );
}
