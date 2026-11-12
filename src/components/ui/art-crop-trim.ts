import type { CSSProperties } from "react";

/** The top trim every layer drawing a Scryfall `art_crop` takes: ArtWash's bands (#2890), which re-export these from
    `art-wash.tsx`, and the crops drawn outside the wash (game history's deck art, the Rule 0 table seat, the change
    commander thumbs, Help me choose's results, Face, the friend card, the signature picker and the landing cards). A
    card face (`image_uri`) is never trimmed: its frame is meant to show. */

export const PORTRAIT_RATIO = 1.37; // art_crop is 626×457

/** The share of an art_crop's height drawn off its top edge. The handoff takes art_crop as
    frame-free, but some printings' crops carry an arc of the card frame across the top: measured
    on Teval, Kratos, and Aang and Katara, the arc reaches 11 of 457 rows at the corners (2.4%).
    3% clears it with a row to spare. Applied to every crop, framed or not, so no band has to know
    which printing it drew; nothing else in the band moves. */
export const ART_TOP_TRIM = 0.03;

/** The trim as a share of the box's WIDTH, for a width-bound crop (a box at least 1.37:1): the crop is
    `width / PORTRAIT_RATIO` tall, so this much of the width is `ART_TOP_TRIM` of the crop. In percent. */
const OF_WIDTH = ((ART_TOP_TRIM / PORTRAIT_RATIO) * 100).toFixed(2);

/** The trim as a share of the box's HEIGHT, for a height-bound crop: grown by `h × 0.03 / 0.97`, the layer is as
    tall as the crop and that lift is `ART_TOP_TRIM` of it. In percent. */
const OF_HEIGHT = ((ART_TOP_TRIM / (1 - ART_TOP_TRIM)) * 100).toFixed(2);

/** The cover bands' trim, as a negative margin on the art layer, which `inset-0` then grows upward
    by the same amount. A percentage margin resolves against the band's WIDTH: a width-bound crop
    (band at least 1.37:1) is `width / PORTRAIT_RATIO` tall, so 2.19% of the width is 3% of the crop.
    A narrower band (a 288px band on a phone under 395px wide) is height-bound: the crop is then as
    tall as the grown layer, and a lift of `height × 0.03 / 0.97` is 3% of it. The larger of the two
    is at least 3% in either case. */
export function coverTopTrimMargin(bandHeight: number): string {
  const ofHeight = ((bandHeight * ART_TOP_TRIM) / (1 - ART_TOP_TRIM)).toFixed(1);
  return `calc(-1 * max(${OF_WIDTH}%, ${ofHeight}px))`;
}

/** The lift, as the larger of the two shares above, read off the nearest size container (the box that clips the art). */
const LIFT = `max(${OF_WIDTH}cqw, ${OF_HEIGHT}cqh)`;

/** The same trim for art in a small box whose size can change with the viewport, so no one pixel height can be named.
    `box` goes on the box that clips the art: it becomes a size container, which the lift reads in container units.
    `layer` goes on an `ArtLayer` (or any `absolute inset-0` background layer) filling that box: its negative margin
    grows the layer upward by the lift, so a `cover` crop's top 3% lies above the box and is clipped. `img` is the same
    for an `<img>` drawn `object-cover` at the box's full size: lifted and grown by the lift (`flex-start` so a flex box
    does not re-centre it).

    The layer keeps its own `background-position` (or `object-position`). Its vertical share `p` then places the crop
    within the grown layer's slack, which only adds to the trim: the crop's hidden top is `lift + p × slack`, never less
    than the lift, so at least 3% of the crop is above the box at any position, and exactly 3% for a height-bound crop
    (no slack) or a top-anchored one (`p = 0`). */
export const ART_CROP_TRIM: { box: string; layer: CSSProperties; img: CSSProperties } = {
  box: "[container-type:size]",
  layer: { marginTop: `calc(-1 * ${LIFT})` },
  img: { marginTop: `calc(-1 * ${LIFT})`, height: `calc(100% + ${LIFT})`, alignSelf: "flex-start" },
};
