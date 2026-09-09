import type { CSSProperties } from "react";
import { cssUrl } from "../../lib/collection/browse";
import { commanderGradient } from "../../lib/collection/gradients";

const tint = (token: string, pct: number) =>
  `color-mix(in oklab, var(${token}) ${pct}%, transparent)`;

/** L3, as `[alphaPercent, positionPercent]` pairs. Heavy where the labels are,
    thin through the middle. Exported because `wash-contrast.test.ts` derives its
    contrast floors from these alphas — the two files drifting apart is the
    failure that test exists to catch. */
export type LabelEdge = "top" | "bottom";

export const COVER_SCRIM_STOPS: Record<LabelEdge, readonly (readonly [number, number])[]> = {
  top: [
    [90, 0],
    [30, 40],
    [52, 74],
    [86, 100],
  ],
  bottom: [
    [66, 0],
    [22, 26],
    [62, 50],
    [90, 100],
  ],
};

const coverScrim = (edge: LabelEdge) =>
  `linear-gradient(180deg, ${COVER_SCRIM_STOPS[edge]
    .map(([alpha, pos]) => `${tint("--bg", alpha)} ${pos}%`)
    .join(", ")})`;

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

/** The deeper shadow the `cover` bands carry. Their type sits over the middle of
    a photograph rather than past a portrait's flat stop, so it is drawn against
    the brightest pixel the crop can put there, not against the row's ground. */
export const COVER_INK_SHADOW = "0 1px 4px rgba(0,0,0,0.85)";

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

type Band = 168 | 148 | 72;

/** Keyed to the band, not to the row: `band` is the only input, so both the mask
    and the scrim travel with it at any row width. Neither the near stop nor the
    flat stop scales with the band — each was drawn against its own surface — so
    they are read from the table rather than derived. Only `width` is derived,
    because it is the crop's own aspect and is also the scrim's third stop.

    `ground` is the ground the row already draws, so the art fades into the row
    instead of into a darker patch of its own: the commander and deck rows sit on
    the page, the resume row draws its own inset surface. */
const BANDS: Record<
  Band,
  {
    maskEnd: number;
    ground: string;
    ambientOpacity: number;
    sharpOpacity: number;
    nearStop: number;
    nearAlpha: number;
    startAlpha: number;
    sharpAlpha: number;
    flatStop: number;
    /** `[startAlpha, midAlpha, midPosition, endAlpha]`. The mid position is per
        band, not shared: 168 damps later than 148 because its type sits lower. */
    vertical: readonly [number, number, number, number] | null;
  }
> = {
  168: {
    maskEnd: 58,
    ground: "--bg",
    ambientOpacity: 0.2,
    sharpOpacity: 0.8,
    nearStop: 134,
    nearAlpha: 26,
    startAlpha: 30,
    sharpAlpha: 78,
    flatStop: 240,
    vertical: [30, 10, 46, 42],
  },
  148: {
    maskEnd: 58,
    ground: "--bg",
    ambientOpacity: 0.2,
    sharpOpacity: 0.8,
    nearStop: 118,
    nearAlpha: 26,
    startAlpha: 30,
    sharpAlpha: 78,
    flatStop: 264,
    vertical: [62, 16, 42, 74],
  },
  72: {
    maskEnd: 62,
    ground: "--surface-inset",
    ambientOpacity: 0.14,
    sharpOpacity: 0.85,
    nearStop: 58,
    nearAlpha: 18,
    startAlpha: 22,
    sharpAlpha: 80,
    flatStop: 138,
    vertical: null,
  },
};

const portrait = (band: Band) => {
  const b = BANDS[band];
  const width = Math.round(band * PORTRAIT_RATIO); // 230 | 203 | 99
  const stops = `${tint(b.ground, b.startAlpha)} 0px, ${tint(b.ground, b.nearAlpha)} ${b.nearStop}px, ${tint(b.ground, b.sharpAlpha)} ${width}px, var(${b.ground}) ${b.flatStop}px`;
  return {
    width,
    ground: b.ground,
    ambientOpacity: b.ambientOpacity,
    sharpOpacity: b.sharpOpacity,
    // Black is the opaque end of a mask's alpha, not a palette colour.
    mask: `linear-gradient(90deg, #000 0 ${b.maskEnd}%, transparent 100%)`,
    scrim: `linear-gradient(90deg, ${stops})`,
    // Layer D: a band that prints type over the full height of the art needs
    // damping at the top and bottom as well as across. The resume row's type
    // starts clear of the portrait, so a vertical ramp there would darken the
    // row for nothing.
    verticalScrim: b.vertical
      ? `linear-gradient(180deg, ${tint("--bg", b.vertical[0])} 0%, ${tint("--bg", b.vertical[1])} ${b.vertical[2]}%, ${tint("--bg", b.vertical[3])} 100%)`
      : null,
  };
};

export type ArtWashProps =
  | {
      strategy: "cover";
      band?: never;
      labelEdge: LabelEdge;
      artCropUri: string | null;
      colorIdentity: string[];
    }
  | {
      strategy: "left-portrait";
      band: Band;
      labelEdge?: never;
      artCropUri: string | null;
      colorIdentity: string[];
    };

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
        style={{ background: coverScrim(props.labelEdge) }}
      />
    </div>
  );
}
