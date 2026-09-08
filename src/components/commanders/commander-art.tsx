// The row's art, shared by the owned lane's `RecCard` and discovery's row.
// Both draw the same shape from the same two fields, so it lives here rather
// than being copied into the second row and left to drift.

import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_COLOR, cssUrl } from "../../lib/collection/browse";

/** The fade that turns a cropped card image into a wash. Identical on both
    breakpoints — only the band's width and the darkening ramp behind the text
    change, because only the text's position changes. */
const BLEED_MASK =
  "linear-gradient(90deg,#000 0,#000 42%,rgba(0,0,0,.5) 72%,transparent)";

/** The legibility ramps, one per band width. Every stop is `--bg` at a rising
    opacity, so the art is at about three-quarters strength under the rank and
    is flat ground by the time the figures start.

    Mixed off the token rather than copied as the literal the frame draws: that
    literal is Amonkhet's background, and under the other five themes it would
    ramp the art down to a colour the page underneath is not. */
const bg = (pct: number) => `color-mix(in oklab, var(--bg) ${pct}%, transparent)`;

const DARKEN_PHONE = `linear-gradient(90deg, ${bg(26)} 0px, ${bg(50)} 88px, ${bg(86)} 168px, ${bg(100)} 250px)`;
const DARKEN_WIDE = `linear-gradient(90deg, ${bg(28)} 0px, ${bg(42)} 108px, ${bg(78)} 220px, ${bg(94)} 336px, ${bg(100)} 452px)`;

/**
 * Commander art bleeding in from the row's leading edge: a 268px band on the
 * phone, 470px on the desktop, cropped wide and faded out under the text.
 *
 * It replaces the thumbnail both rows used to draw. No row shows a printing
 * thumbnail at rest on either lane at either breakpoint — the row identifies
 * the commander, and a commander is not a printing. A thumb returns only if a
 * printing is ever named on the row, which is a different row.
 *
 * Decorative, and absolutely positioned inside the row's `relative` wrapper, so
 * it sits over the wrapper's hover fill and under everything the row prints.
 * The image is the fallback gradient's job when a commander has no art, which
 * is what grid-view, the card modal and the builder spine all do.
 */
export function CommanderBleed({
  imageUri,
  colorIdentity,
}: {
  imageUri: string | null;
  colorIdentity: string[];
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-0 z-0 w-[268px] overflow-hidden sm:w-[470px]"
      style={{
        maskImage: BLEED_MASK,
        WebkitMaskImage: BLEED_MASK,
        background: imageUri ? undefined : commanderGradient(colorIdentity),
        backgroundImage: imageUri ? cssUrl(imageUri) : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center 22%",
      }}
    >
      <div className="absolute inset-0 sm:hidden" style={{ background: DARKEN_PHONE }} />
      <div className="absolute inset-0 hidden sm:block" style={{ background: DARKEN_WIDE }} />
    </div>
  );
}

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
  size = 9,
}: {
  colorIdentity: string[];
  size?: number;
}) {
  if (colorIdentity.length === 0) return null;
  return (
    <span aria-hidden="true" className="flex shrink-0 items-center gap-[3px]">
      {colorIdentity.map((color) => (
        <span
          key={color}
          className="block shrink-0 rounded-full"
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
