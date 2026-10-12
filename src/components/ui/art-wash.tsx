import type { CSSProperties } from "react";
import { cssUrl } from "../../lib/collection/browse";
import { commanderGradient } from "../../lib/collection/gradients";
import { NearViewportArt } from "./art-wash-near";

const tint = (token: string, pct: number) =>
  `color-mix(in oklab, var(${token}) ${pct}%, transparent)`;

export type ScrimStops = readonly (readonly [number, number])[];

/** The bands a commander's image is drawn at. Plain numbers chosen per class,
    rather than an aspect ratio that made a band's height a function of the
    column it landed in: a page header is 288, a grid cell telling you which deck
    is which is 248, a full-width result row you scan down is 208, and a
    secondary cell on a page about something else is 168. What governs which is
    what the box is for, never the viewport.

    72 is the resume row's, and it is the one band that is not a class: that row
    draws its portrait as a COLUMN beside its type rather than under it, which is
    the treatment it has always shipped. */
export type BandHeight = 72 | 168 | 208 | 248 | 288;

/** The ramp under a label block, in `[alphaPercent, positionPercent]` pairs:
    clear above the block, climbing into it, then holding one value to the band's
    foot. Held rather than still climbing, because ink printed on a rising ramp
    stands on ground the line above it never did — which is how 3.16:1 shipped.

    **`labelAtPx` is pixels from the band's foot, and `band` is required.** The
    stops this returns are gradient *position* percentages, so a pixel value
    through a one-argument percentage signature would hold the scrim at 46% of a
    248px band where the drawing puts it at 81% — the scrim landing almost exactly
    where the commander-image round removes it, which is worse than not moving it
    at all. The second argument is what makes that impossible rather than merely
    discouraged.

    Pixels rather than a percentage is the round's load-bearing change: a
    percentage made a taller band scale its own darkness, so every band added
    height to its scrim. In pixels, added height lands on art.

    `0.48` and `73` are the shipped constants — `1.48` is `at + 0.48·at` folded
    together.

    **`hold` is a parameter because the two strategies fade their art by different
    amounts.** 73% clears 4.5:1 for `--fg-body` over a pure white pixel at the
    `cover` band's 0.8 art, which is what it was measured against. A
    `left-portrait`'s sharp layer draws at 0.92, so the same 73 leaves that ink at
    **4.33:1** — measured, across all six themes — and the hand-written column
    this function replaced held at 78 for exactly that reason. One ramp function
    with one shape, and the one number that has to answer to the art beneath it
    stays answerable. Exported because `wash-contrast.test.ts` derives its contrast floors
    from these alphas; the two files drifting apart is the failure that test
    exists to catch. */
export const PORTRAIT_HOLD = 78;

export const bottomScrimStops = (
  labelAtPx: number,
  band: number,
  hold = 73,
): ScrimStops => [
  [0, 0],
  [0, Math.round(((band - 1.48 * labelAtPx) / band) * 100)],
  [hold, Math.round(((band - labelAtPx) / band) * 100)],
  [hold, 100],
];

const coverScrim = (stops: ScrimStops) =>
  `linear-gradient(180deg, ${stops
    .map(([alpha, pos]) => `${tint("--bg", alpha)} ${pos}%`)
    .join(", ")})`;

/** Exported so `wash-contrast.test.ts` measures the opacity that ships rather
    than a copy of it. */
export const COVER_ART_OPACITY = 0.8;

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
    colour. The resume row was the stated exception while its type started at a
    116px inset clear of the portrait; a `cover` band puts every string of it back
    on the wash, so the exception goes with the band. */
export const INK_SHADOW = "0 1px 3px rgba(0,0,0,.6)";

/** The deeper shadow the `cover` bands carry. Their type sits over the middle of
    a photograph rather than past a portrait's flat stop, so it is drawn against
    the brightest pixel the crop can put there, not against the row's ground. */
export const COVER_INK_SHADOW = "0 1px 4px rgba(0,0,0,0.85)";

export const PORTRAIT_RATIO = 1.37; // art_crop is 626×457

/** A ceiling, not a value. The handoff's `.3` was written for the cover band's
    art at `.58`; applied flat it would raise any layer already drawn below it,
    answering a preference that asks for less art by showing more. It was the
    `left-portrait` ambient copy that made the distinction matter; that layer is
    gone, and the rule stays because it is the honest way to apply a ceiling. */
const REDUCED_ART_OPACITY = 0.3;

/** `art: false` is the identity gradient, which is ground rather than
    photography — it hides no text, and it is the only identity signal a
    commander with no crop has, so it keeps its opacity under the preference. */
const reducible = (opacity: number, art: boolean): CSSProperties =>
  ({
    opacity,
    "--art-wash-reduced-opacity": art ? Math.min(opacity, REDUCED_ART_OPACITY) : opacity,
  }) as CSSProperties;

/** The portrait widths a `left-portrait` band draws, derived from the band each
    one was chosen for: `height × 1.37`, the crop's own aspect, giving 230 / 285 /
    340. **560 inverts that and is the only one that does** — the desktop deck
    header picks the portrait's shape first and lets the band follow, because 288
    is what keeps that crop from scaling past ~42%.

    99 joins them as the resume row's portrait column — not derived from that
    row's 72px band but the width it has always drawn, with its own mask, ground
    and clear stop in the table below.

    The five a stated band may draw. */
export type PortraitWidth = 560 | 340 | 285 | 230 | 99;

/** Keyed to the portrait's **width**, not to the band's height. Every column here
    is a function of the width — `clearTo` is `maskEnd%` of it by derivation, the
    flat stop is drawn a few pixels past it, and the mask and sharp alpha are
    constants across every row that ships. The height only chose the width by
    convention, and on the desktop deck header the handoff inverts even that.

    Keying by height cannot express the one surface with two geometries: the
    desktop deck header draws a 560px portrait above ~1200px of row and a 340px
    portrait below it, on the same 288px band.

    `ground` is the ground the row already draws, so the art fades into the row
    instead of into a darker patch of its own.

    Exported for the same reason `COVER_ART_OPACITY` is: `wash-contrast.test.ts`
    composes these numbers back into the ground a row's ink sits on, so lifting an
    art opacity here moves the floor that test asserts rather than quietly passing
    an old one. */
export const PORTRAITS: Record<
  PortraitWidth,
  {
    maskEnd: number;
    ground: string;
    sharpOpacity: number;
    sharpAlpha: number;
    /** Where the horizontal scrim's clear run ends. Derived from `maskEnd` and
        the width for every row that agrees with that rule; stated only by the
        one shipped row that does not. */
    clearTo?: number;
    /** Where the horizontal scrim has closed to opaque ground, so any type at or
        past it stands on `--bg` rather than on the crop. It does NOT derive from
        the width: each value was drawn against its own surface, chosen so the
        title column clears the mask's tail by about 15px — 584 for the 560
        portrait, 356 for 340, 300 for 285 and 240 for 230, each a little past
        the portrait's own edge. */
    flatStop: number;
  }
> = {
  560: { maskEnd: 58, ground: "--bg", sharpOpacity: 0.92, sharpAlpha: 78, flatStop: 584 },
  340: { maskEnd: 58, ground: "--bg", sharpOpacity: 0.92, sharpAlpha: 78, flatStop: 356 },
  285: { maskEnd: 58, ground: "--bg", sharpOpacity: 0.92, sharpAlpha: 78, flatStop: 300 },
  230: { maskEnd: 58, ground: "--bg", sharpOpacity: 0.92, sharpAlpha: 78, flatStop: 240 },
  // The resume row's portrait column, restored with the row it belongs to. Its
  // numbers are the ones that shipped before this round, not new ones: a 62%
  // mask rather than 58, the row's own `--surface-inset` ground, and a flat stop
  // at 138. 99px of portrait plus a 17px gap is where that row's 116px type
  // inset comes from — BESIDE the art, which is why the band draws no vertical
  // ramp. The inset is 22px short of the flat stop, not past it, so that ink
  // stands on a horizontal scrim still climbing: `flat` suppresses the vertical
  // ramp and says nothing about the horizontal ground.
  // The resume row's portrait column, restored with the row it belongs to, and
  // restored to what SHIPPED rather than to the rule: 0.95 is the lift it took
  // when the ambient layer under it was deleted, and its clear stop is an
  // explicit 58 where the rule would derive 61. Three pixels, and they are the
  // fade this row has always drawn — a "restoration" that changed them would be
  // a new geometry wearing the old one's numbers.
  99: {
    maskEnd: 62,
    ground: "--surface-inset",
    sharpOpacity: 0.95,
    sharpAlpha: 80,
    clearTo: 58,
    flatStop: 138,
  },
};

const portrait = (
  width: PortraitWidth,
  labelAtPx: number | "flat",
  band: number,
) => {
  const b = PORTRAITS[width];
  const clearTo = b.clearTo ?? Math.round((b.maskEnd / 100) * width);
  // Which dimension the crop is scaled by, derived rather than declared. A
  // portrait no wider than `band × 1.37` is filled by scaling the crop to the
  // band's height — `auto 100%` — which is what every derived width does, and
  // the crop then overhangs the box on the right and is masked there.
  //
  // The one inverted geometry cannot do that. At 560 on a 288 band, a
  // height-scaled crop is 395px wide, so 165px of the box would be ground with
  // no art in it while the mask and the scrim were positioned as though art
  // reached 560. That portrait is scaled by its width instead and loses the
  // bottom of the crop rather than the right of the box — `center top`, which is
  // A1 and is what keeps the face in frame.
  const widthDriven = width > Math.round(band * PORTRAIT_RATIO);
  // The leading pair is the row's ground at zero alpha rather than the
  // `transparent` keyword: `transparent` is a transparent *black*, and
  // interpolating from it lays a grey haze over the half of the crop this ramp
  // is meant to leave alone.
  const stops = `${tint(b.ground, 0)} 0px, ${tint(b.ground, 0)} ${clearTo}px, ${tint(b.ground, b.sharpAlpha)} ${width}px, var(${b.ground}) ${b.flatStop}px`;
  // Layer D: a band that prints type over the portrait needs damping down the
  // band as well as across. A band whose ink sits BESIDE the portrait is `flat`
  // — a vertical ramp there would darken the row to protect nothing.
  const vertical: ScrimStops | null =
    labelAtPx === "flat" ? null : bottomScrimStops(labelAtPx, band, PORTRAIT_HOLD);
  return {
    width,
    ground: b.ground,
    sharpOpacity: b.sharpOpacity,
    size: widthDriven ? "cover" : "auto 100%",
    position: widthDriven ? "center top" : "left center",
    // Black is the opaque end of a mask's alpha, not a palette colour.
    mask: `linear-gradient(90deg, #000 0 ${b.maskEnd}%, transparent 100%)`,
    scrim: `linear-gradient(90deg, ${stops})`,
    verticalScrim: vertical
      ? `linear-gradient(180deg, ${vertical
          .map(([alpha, pos]) => `${tint("--bg", alpha)} ${pos}%`)
          .join(", ")})`
      : null,
  };
};

type ArtProps = {
  artCropUri: string | null;
  colorIdentity: string[];
};

export type ArtWashProps = ArtProps &
  (
    | {
        strategy: "cover";
        /** The band, in px. Stated rather than taken from an `aspect-ratio`, so a
            wider column can no longer make a band taller and a taller band can no
            longer over-scale the crop. */
        height: BandHeight;
        /** The label block's measured height, in **pixels from the band's foot**.
            Measured, never intended: a block costed at 57px whose title wraps to
            three lines is 83px, and a ramp derived from 57 holds where the block
            ends rather than where it starts, putting its first line on unscrimmed
            art. */
        labelAtPx: number;
        portrait?: never;
        /** Only a left portrait defers its crop: a cover band is not drawn in a long list. */
        deferArt?: never;
      }
    | {
        strategy: "left-portrait";
        /** Ask for the crop only after hydration, once the band nears the viewport. A list sets it on
            every row below its first screen: on the slow profile, /discover's eager crops held its
            hydration at 14.2s at 390, and deferring all but the first five rows brought it to 6.8s. */
        deferArt?: boolean;
        height: BandHeight;
        /** Chosen, not derived: one band draws two portraits on the one surface
            whose shape was picked before its height. */
        portrait: PortraitWidth;
        /** `flat` means NO VERTICAL RAMP — the band draws its horizontal scrim
            and nothing else.

            Two kinds of row ask for it, and neither is about the flat stop. The
            deck header's ink starts past its portrait's flat stop, on fully
            opaque ground. The resume row's starts at its 116px inset — clear of
            the 99px portrait, but 22px SHORT of that row's 138px flat stop, so
            its ink stands on a horizontal scrim still climbing, which is the
            thinnest ground anything on that row gets and is asserted at exactly
            that inset in `wash-contrast.test.ts`.

            What both share is that their ink is BESIDE the art rather than over
            it, so a vertical ramp would darken the band top to bottom to protect
            nothing. That is the contract this value states. */
        labelAtPx: number | "flat";
      }
  );

export function ArtWash(props: ArtWashProps) {
  const { artCropUri, colorIdentity } = props;
  // L1: the base plate, under the art, so a slow or missing image never flashes
  // light ground.
  if (props.strategy === "left-portrait") {
    const { height } = props;
    const p = portrait(props.portrait, props.labelAtPx, height);
    return (
      // The root declares the band rather than stretching to the row: the sharp
      // layer's `auto 100%` resolves against this box, so a taller row can no
      // longer over-scale the crop and clip it at the fixed portrait width.
      <div
        aria-hidden="true"
        // The hook a browser probe reads, and it is on the root rather than on a
        // scrim class because the two strategies draw different scrims: a stated
        // `left-portrait` band has no `-cover` class to find it by, so keying the
        // check to one strategy's class would silently stop covering the other.
        data-art-wash-band={height}
        // The block this band's ramp was keyed to, in px. Published because a
        // probe cannot otherwise tell a correct hold from a plausible one: a 57
        // read as a percentage on a 288 band lands at 57%, which is a perfectly
        // ordinary-looking number, and only the expected `(band − at) / band`
        // exposes it. With this, that comparison is exact rather than a threshold.
        data-art-wash-label-at={props.labelAtPx === "flat" ? undefined : props.labelAtPx}
        // Stated when the band draws NO vertical ramp by intent, so a probe can
        // tell that from a ramp that went missing: both look like one 90deg
        // scrim, and one of them is a band whose ink is standing on a rising
        // gradient nobody meant to draw.
        data-art-wash-flat={props.labelAtPx === "flat" ? "" : undefined}
        className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
        style={{ background: `var(${p.ground})`, height: `${height}px` }}
      >
        {/* The identity gradient stands in for a crop, and only for a crop: with
            art there is no full-bleed layer here at all. There used to be one —
            the same crop drawn `cover` across the whole band at an ambient 0.28
            — and at any width past the portrait's own it was a second,
            differently-scaled copy of the picture sitting behind the first. It
            read as a double image, most plainly while the window resized and the
            two scalings moved against each other. The horizontal scrim already
            closes the portrait out into the row's ground, so nothing held that
            layer up but the atmosphere it was meant to add. */}
        {artCropUri ? null : (
          <div
            className="art-wash-art absolute inset-0"
            style={{ ...reducible(1, false), background: commanderGradient(colorIdentity) }}
          />
        )}
        {artCropUri && props.deferArt ? (
          <NearViewportArt
            src={artCropUri}
            className="art-wash-art absolute inset-y-0 left-0"
            style={{
              ...reducible(p.sharpOpacity, true),
              width: `${p.width}px`,
              backgroundSize: p.size,
              backgroundPosition: p.position,
              backgroundRepeat: "no-repeat",
              maskImage: p.mask,
              WebkitMaskImage: p.mask,
            }}
          />
        ) : artCropUri ? (
          <div
            className="art-wash-art absolute inset-y-0 left-0"
            style={{
              ...reducible(p.sharpOpacity, true),
              width: `${p.width}px`,
              backgroundImage: cssUrl(artCropUri),
              backgroundSize: p.size,
              backgroundPosition: p.position,
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
      data-art-wash-band={props.height}
      data-art-wash-label-at={props.labelAtPx}
      className="pointer-events-none absolute inset-x-0 top-0 overflow-hidden"
      // R6 ruling 1: the plate is a loading device, not a ground. With no art
      // there is nothing to load, so an artless band grounds in `var(--bg)`
      // rather than in a darker patch that would seam against the surface below.
      style={{
        background: artCropUri ? COVER_PLATE : "var(--bg)",
        // The band owns its own height, exactly as `left-portrait` does, so the
        // crop's `cover` resolves against the band rather than against whatever
        // the row grew to.
        height: `${props.height}px`,
      }}
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
        // No edge in the class any more, because there is no longer an edge to
        // choose. The `-top` variant existed so the reduced-transparency override
        // could replace one ramp wholesale; every band labels at its foot now, so
        // that override has no subject and is deleted with it. The preference
        // rides on `.art-wash-art`'s opacity alone — which is permanent rather
        // than provisional, since a bottom ramp's stops come from a `labelAtPx`
        // no stylesheet can see. Reaching the scrim too would mean emitting the
        // ramp as a CSS variable, which is open with Design as B9.
        className="art-wash-scrim art-wash-scrim-cover absolute inset-0"
        style={{ background: coverScrim(bottomScrimStops(props.labelAtPx, props.height)) }}
      />
    </div>
  );
}
