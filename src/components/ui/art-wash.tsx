import type { CSSProperties } from "react";
import { cssUrl } from "../../lib/collection/browse";
import { commanderGradient } from "../../lib/collection/gradients";

const tint = (token: string, pct: number) =>
  `color-mix(in oklab, var(${token}) ${pct}%, transparent)`;

/** L3. Heavy where the labels are, thin through the middle third. The fourth
    stop is what lets the status chip sit on art without its own plate. */
const SCRIM = `linear-gradient(180deg, ${tint("--bg", 90)} 0%, ${tint("--bg", 30)} 40%, ${tint("--bg", 52)} 74%, ${tint("--bg", 86)} 100%)`;

const COVER_ART_OPACITY = 0.58;

/** L1, the base plate: one step below the page ground, so a slow or missing
    image never flashes light. No token is darker than `--bg` and the handoff
    forbids adding one, so the plate derives from it and each theme gets its own
    value of the same rule. `left-portrait` deliberately does not use this — those
    rows plate to the row's own ground, so the art fades into the row rather than
    into a darker patch of its own. */
const COVER_PLATE = "color-mix(in srgb, var(--bg) 86%, black)";

/** Decision 3 — ink over art carries a shadow, at full opacity, never an alpha
    colour. The resume row is the stated exception: its type starts at the 116px
    inset, clear of the portrait, and carries none. */
export const INK_SHADOW = "0 1px 3px rgba(0,0,0,.6)";

const PORTRAIT_RATIO = 1.37; // art_crop is 626×457

/** A ceiling, not a value. The handoff's `.3` was written for the cover band's
    art at `.58`; applied flat it would make a `left-portrait` row's ambient copy
    *more* prominent under a preference that asks for less. */
const REDUCED_ART_OPACITY = 0.3;

/** `art: false` is the identity gradient, which is ground rather than
    photography — it hides no text, and it is the only identity signal a
    commander with no crop has, so it keeps its opacity under the preference. */
const reducible = (opacity: number, art: boolean): CSSProperties =>
  ({
    opacity,
    "--art-wash-reduced-opacity": art ? Math.min(opacity, REDUCED_ART_OPACITY) : opacity,
  }) as CSSProperties;

/** Keyed to the band, not to the row: `band` is the only input, so both the mask
    and the scrim travel with it at any row width. */
const portrait = (band: 148 | 72) => {
  const width = Math.round(band * PORTRAIT_RATIO); // 203 | 99
  const maskEnd = band === 148 ? 58 : 62; // a fraction of the art
  // The scrim resolves into the ground the row already draws, so the art fades
  // into the row instead of into a darker patch of its own. The commander row
  // sits on the page; the resume row draws its own inset surface.
  const ground = band === 148 ? "--bg" : "--surface-inset";
  const stops =
    band === 148
      ? `${tint(ground, 30)} 0px, ${tint(ground, 26)} 118px, ${tint(ground, 78)} ${width}px, var(${ground}) 264px`
      : `${tint(ground, 22)} 0px, ${tint(ground, 18)} 58px, ${tint(ground, 80)} ${width}px, var(${ground}) 138px`;
  return {
    width,
    ground,
    ambientOpacity: band === 148 ? 0.2 : 0.14,
    sharpOpacity: band === 148 ? 0.8 : 0.85,
    // Black is the opaque end of a mask's alpha, not a palette colour.
    mask: `linear-gradient(90deg, #000 0 ${maskEnd}%, transparent 100%)`,
    scrim: `linear-gradient(90deg, ${stops})`,
    // Layer D, and only at 148: the commander row prints its rank, name and fit
    // over the full height of the art, so the art needs damping at the top and
    // bottom as well as across. The resume row's type starts clear of the
    // portrait, so a vertical ramp there would darken the row for nothing.
    verticalScrim:
      band === 148
        ? `linear-gradient(180deg, ${tint("--bg", 62)} 0%, ${tint("--bg", 16)} 42%, ${tint("--bg", 74)} 100%)`
        : null,
  };
};

export type ArtWashProps =
  | { strategy: "cover"; band?: never; artCropUri: string | null; colorIdentity: string[] }
  | { strategy: "left-portrait"; band: 148 | 72; artCropUri: string | null; colorIdentity: string[] };

export function ArtWash(props: ArtWashProps) {
  const { artCropUri, colorIdentity } = props;
  // L1: the base plate, under the art, so a slow or missing image never flashes
  // light ground.
  if (props.strategy === "left-portrait") {
    const p = portrait(props.band);
    return (
      // The root declares the band rather than stretching to the row: the sharp
      // layer's `auto 100%` resolves against this box, so a taller row can no
      // longer over-scale the crop and clip it at the fixed portrait width.
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
        style={{ background: `var(${p.ground})`, height: `${props.band}px` }}
      >
        <div
          className="art-wash-art absolute inset-0"
          style={{
            ...reducible(artCropUri ? p.ambientOpacity : 1, Boolean(artCropUri)),
            background: artCropUri ? undefined : commanderGradient(colorIdentity),
            backgroundImage: artCropUri ? cssUrl(artCropUri) : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
          }}
        />
        {artCropUri ? (
          <div
            className="art-wash-art absolute inset-y-0 left-0"
            style={{
              ...reducible(p.sharpOpacity, true),
              width: `${p.width}px`,
              backgroundImage: cssUrl(artCropUri),
              backgroundSize: "auto 100%",
              backgroundPosition: "left center",
              backgroundRepeat: "no-repeat",
              maskImage: p.mask,
              WebkitMaskImage: p.mask,
            }}
          />
        ) : null}
        <div className="art-wash-scrim absolute inset-0" style={{ background: p.scrim }} />
        {p.verticalScrim ? (
          <div
            className="art-wash-scrim absolute inset-0"
            style={{ background: p.verticalScrim }}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ background: COVER_PLATE }}
    >
      <div
        className="art-wash-art absolute inset-0"
        style={{
          ...reducible(artCropUri ? COVER_ART_OPACITY : 1, Boolean(artCropUri)),
          background: artCropUri ? undefined : commanderGradient(colorIdentity),
          backgroundImage: artCropUri ? cssUrl(artCropUri) : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div
        className="art-wash-scrim art-wash-scrim-cover absolute inset-0"
        style={{ background: SCRIM }}
      />
    </div>
  );
}
