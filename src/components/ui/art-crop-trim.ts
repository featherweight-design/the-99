import type { CSSProperties } from "react";

/** The shared top trim for every layer that draws a Scryfall `art_crop`: ArtWash's bands (#2890) and the art drawn
    outside them. Kept apart from `art-wash.tsx`, which re-exports it, so a small layer can take the trim without
    taking the wash. */

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

/** The same trim for an `ArtLayer` (`absolute inset-0`, `background-size: cover`) filling a small box whose size
    changes with the viewport, so no one pixel height can be named: `box` on the box that clips the layer, `layer` on
    the layer. The box becomes a size container and the layer's lift reads it in container units, the larger of the
    two lifts exactly as `coverTopTrimMargin` takes them. The layer grows upward by the crop's top `ART_TOP_TRIM` and
    the box clips that sliver, so whatever `background-position` the layer carries still places the crop within the
    rest: the box draws what it drew, less the top 3% of the crop. */
export const ART_CROP_TRIM: { box: string; layer: CSSProperties } = {
  box: "[container-type:size]",
  layer: { marginTop: `calc(-1 * max(${OF_WIDTH}cqw, ${OF_HEIGHT}cqh))` },
};
