/**
 * The foil mark's words (foil handoff addendum M1, R4: `design/design_handoff_the99_foil_treatment/addendum-foil-mark/`).
 * One glint and one key entry for foil and etched, so the key says `foil` alone; the tooltip and the spoken name still
 * tell the two finishes apart.
 */
import type { FoilFinish } from "../collection/browse";

export const foilMarkCopy = {
  /** The key entry, after a drawn glint (R4: foil and etched share one). */
  key: "foil",
  tooltip: {
    foil: "Every copy you own of this printing is foil.",
    etched: "Every copy you own of this printing is etched foil.",
    /** A precon: the box's own copies, never the player's. */
    preconOne: "This deck’s copy is foil.",
    preconMany: "This deck’s copies are foil.",
  },
  /** Appended to a name in its tile's or row's accessible name. */
  spoken: { foil: ", foil", etched: ", etched foil" },
  /** The glint's own accessible name when it is not silent. */
  name: { foil: "foil", etched: "etched foil" },
} as const;

/** The clause a name takes, or nothing for a card with no finish to say. */
export function foilSpoken(finish: FoilFinish | undefined): string {
  return finish ? foilMarkCopy.spoken[finish] : "";
}
