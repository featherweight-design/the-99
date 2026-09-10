import type { CSSProperties } from "react";
import { cssUrl } from "../../lib/collection/browse";
import { commanderGradient } from "../../lib/collection/gradients";

const tint = (token: string, pct: number) =>
  `color-mix(in oklab, var(${token}) ${pct}%, transparent)`;

/** L3, as `[alphaPercent, positionPercent]` pairs. Heavy across the whole label
    block, then thin for the rest of the band. The dark value is *held* to the
    block's foot rather than ramping away from its first stop: a ramp that starts
    dark at the title and lightens through the subtitle leaves the subtitle on
    ground the title never stood on, which is how 3.16:1 shipped. Exported
    because `wash-contrast.test.ts` derives its contrast floors from these alphas
    — the two files drifting apart is the failure that test exists to catch.

    Below the block the ramp thins and stays thin. It used to climb back to 50%
    at the band's foot, which washed the crop for nothing: every chip down there
    — the deck tile's status pill, the ready-to-build card's fit chip — mixes its
    fill into `--bg` rather than into transparency, so each one is already opaque
    at the alpha it draws and the scrim was protecting ink that did not need it.
    The colour pips beside them are `aria-hidden` swatches, not type. */
export type LabelEdge = "top" | "bottom";

export type ScrimStops = readonly (readonly [number, number])[];

export const COVER_SCRIM_STOPS: { top: ScrimStops } = {
  top: [
    [78, 0],
    [78, 31],
    [14, 62],
    [14, 100],
  ],
};

/** The bottom ramp is derived from where the label block starts rather than
    read from a constant. A shared stop is a guess about a band whose height
    comes from an `aspect-ratio` and whose block position comes from its own
    content: at its tallest the commander hero's block starts at 55% of the band
    and the deck spine's at 57%, and each rises by ten points or so when its
    title fits on one line, so any single number is late for one of them — and
    late means ink printed on a ramp that has not reached its dark value yet.

    `labelAt` is the block's top edge as a percentage of band height. Above it
    the ramp runs at zero alpha and only starts climbing at 48% of it, so the
    clear part stays in the picture's middle whatever `labelAt` is instead of
    being pushed up into the block by a low one.

    Nothing above the block is ink on this wash. The identity pips are
    `aria-hidden` swatches, and the `⛶ Card details` chip plates itself in
    opaque `--bg` — so the 44% this ramp used to carry at the band's top edge
    was veiling the one part of the crop `center top` puts the face in. Below
    the block it holds one value rather than climbing to 88% at the foot: 73%
    already clears 4.5:1 for `--fg-body` against a pure white pixel, and the
    band's last row of ink is the subtitle, not its bottom edge. */
export const bottomScrimStops = (labelAt: number): ScrimStops => [
  [0, 0],
  [0, Math.round(labelAt * 0.48)],
  [73, labelAt],
  [73, 100],
];

const coverScrim = (stops: ScrimStops) =>
  `linear-gradient(180deg, ${stops
    .map(([alpha, pos]) => `${tint("--bg", alpha)} ${pos}%`)
    .join(", ")})`;

/** Exported so `wash-contrast.test.ts` measures the opacity that ships rather
    than a copy of it. */
export const COVER_ART_OPACITY = 0.8;

/** The plate a chip paints between the wash and its own label, as a `color-mix`
    percentage of `--bg`. A chip is the one thing that prints where the scrim is
    thin — the `⛶ Card details` pill sits above a bottom label block, where the
    ramp is now clear — so it carries the whole burden itself and needs no help
    from the band it sits on. 72% is what `--fg` needs over a pure white pixel at
    `COVER_ART_OPACITY`; `wash-contrast.test.ts` measures it against all six
    themes. Below it the chip was relying on a scrim that veiled the crop for
    every surface, to protect one 26px control. */
export const OVER_ART_PLATE = 72;

/** L1, the base plate: one step below the page ground, so a slow image never
    flashes light. No token is darker than `--bg` and the handoff forbids adding
    one, so the plate derives from it and each theme gets its own value of the
    same rule. Applied only while there is a crop to load — an artless band
    grounds in `var(--bg)`, the scrim's own final stop, per R6 ruling 1.
    `left-portrait` deliberately does not use this — those rows plate to the
    row's own ground, so the art fades into the row rather than into a darker
    patch of its own. */
const COVER_PLATE = "color-mix(in srgb, var(--bg) 86%, black)";

/** Decision 3 — ink over art carries a shadow, at full opacity, never an alpha
    colour. The resume row is the stated exception: its type starts at the 116px
    inset, clear of the portrait, and carries none. */
export const INK_SHADOW = "0 1px 3px rgba(0,0,0,.6)";

/** The deeper shadow the `cover` bands carry. Their type sits over the middle of
    a photograph rather than past a portrait's flat stop, so it is drawn against
    the brightest pixel the crop can put there, not against the row's ground. */
export const COVER_INK_SHADOW = "0 1px 4px rgba(0,0,0,0.85)";

export const PORTRAIT_RATIO = 1.37; // art_crop is 626×457

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

export type Band = 168 | 148 | 72;

/** Keyed to the band, not to the row: `band` is the only input, so both the mask
    and the scrim travel with it at any row width. Neither the near stop nor the
    flat stop scales with the band — each was drawn against its own surface — so
    they are read from the table rather than derived. Only `width` is derived,
    because it is the crop's own aspect and is also the scrim's third stop.

    `ground` is the ground the row already draws, so the art fades into the row
    instead of into a darker patch of its own: the commander and deck rows sit on
    the page, the resume row draws its own inset surface.

    Exported for the same reason `COVER_SCRIM_STOPS` is: `wash-contrast.test.ts`
    composes these numbers back into the ground a row's ink sits on, so lifting
    an art opacity here moves the floor that test asserts rather than quietly
    passing an old one. */
export const PORTRAIT_BANDS: Record<
  Band,
  {
    maskEnd: number;
    ground: string;
    ambientOpacity: number;
    sharpOpacity: number;
    /** How far the portrait runs unwashed. Past it the scrim climbs to its flat
        stop, closing the crop out into the row before any type starts. */
    clearTo: number;
    sharpAlpha: number;
    flatStop: number;
    /** The vertical ramp, in the same `[alpha, position]` pairs the cover bands
        use. Every `left-portrait` row anchors its type to the band's foot, so
        each ramp is clear above its own block and holds one value from the
        block's top edge to the bottom of the band — held rather than still
        climbing, for the reason the cover's top ramp holds: ink printed on a
        rising ramp stands on ground the line above it never did. The hold is
        per band because the blocks start at different heights. */
    vertical: ScrimStops | null;
  }
> = {
  168: {
    maskEnd: 58,
    ground: "--bg",
    ambientOpacity: 0.28,
    sharpOpacity: 0.92,
    clearTo: 134,
    sharpAlpha: 78,
    flatStop: 240,
    // No ramp. The spine's title starts at a 254px inset, past the flat stop,
    // and the only other ink on this band is the `⛶ Card details` pill at the
    // bottom-left, which now plates itself to `OVER_ART_PLATE` and stands on its
    // own. A ramp drawn for one 26px control damped the crop under the whole
    // band's width.
    vertical: null,
  },
  148: {
    maskEnd: 58,
    ground: "--bg",
    ambientOpacity: 0.28,
    sharpOpacity: 0.92,
    clearTo: 118,
    sharpAlpha: 78,
    flatStop: 264,
    // One ramp for both widths. The rows are `items-end` at either breakpoint,
    // so the phone's block (top at 65%) sits inside the desktop's (top at 55%)
    // and a hold from 55% covers both.
    vertical: [
      [0, 0],
      [0, 38],
      [78, 55],
      [78, 100],
    ],
  },
  72: {
    maskEnd: 62,
    ground: "--surface-inset",
    ambientOpacity: 0.22,
    sharpOpacity: 0.95,
    clearTo: 58,
    sharpAlpha: 80,
    flatStop: 138,
    vertical: null,
  },
};

const portrait = (band: Band) => {
  const b = PORTRAIT_BANDS[band];
  const width = Math.round(band * PORTRAIT_RATIO); // 230 | 203 | 99
  // The leading pair is the row's ground at zero alpha rather than the
  // `transparent` keyword: `transparent` is a transparent *black*, and
  // interpolating from it lays a grey haze over the half of the crop this ramp
  // is meant to leave alone.
  const stops = `${tint(b.ground, 0)} 0px, ${tint(b.ground, 0)} ${b.clearTo}px, ${tint(b.ground, b.sharpAlpha)} ${width}px, var(${b.ground}) ${b.flatStop}px`;
  return {
    width,
    ground: b.ground,
    ambientOpacity: b.ambientOpacity,
    sharpOpacity: b.sharpOpacity,
    // Black is the opaque end of a mask's alpha, not a palette colour.
    mask: `linear-gradient(90deg, #000 0 ${b.maskEnd}%, transparent 100%)`,
    scrim: `linear-gradient(90deg, ${stops})`,
    // Layer D: a band that prints type over the portrait needs damping down the
    // band as well as across. The resume row's type starts clear of the
    // portrait, so a vertical ramp there would darken the row for nothing.
    verticalScrim: b.vertical
      ? `linear-gradient(180deg, ${b.vertical
          .map(([alpha, pos]) => `${tint("--bg", alpha)} ${pos}%`)
          .join(", ")})`
      : null,
  };
};

export type ArtWashProps =
  | {
      strategy: "cover";
      band?: never;
      labelEdge: "top";
      labelAt?: never;
      artCropUri: string | null;
      colorIdentity: string[];
    }
  | {
      strategy: "cover";
      band?: never;
      labelEdge: "bottom";
      /** The label block's top edge, as a percentage of band height. */
      labelAt: number;
      artCropUri: string | null;
      colorIdentity: string[];
    }
  | {
      strategy: "left-portrait";
      band: Band;
      labelEdge?: never;
      labelAt?: never;
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
          <div className="art-wash-scrim absolute inset-0" style={{ background: p.verticalScrim }} />
        ) : null}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      // R6 ruling 1: the plate is a loading device, not a ground. With no art
      // there is nothing to load, so an artless band grounds in `var(--bg)`
      // rather than in a darker patch that would seam against the surface below.
      style={{ background: artCropUri ? COVER_PLATE : "var(--bg)" }}
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
        // The edge is in the class as well as in the stops: the
        // reduced-transparency override replaces this gradient wholesale, and
        // one replacement cannot describe both bands — a top-labelled ramp
        // applied to a bottom-labelled one puts the thin part of the wash
        // exactly where the block starts.
        className={`art-wash-scrim art-wash-scrim-cover art-wash-scrim-cover-${props.labelEdge} absolute inset-0`}
        style={{
          background: coverScrim(
            props.labelEdge === "top" ? COVER_SCRIM_STOPS.top : bottomScrimStops(props.labelAt),
          ),
        }}
      />
    </div>
  );
}
