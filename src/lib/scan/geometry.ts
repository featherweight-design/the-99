/**
 * The card-scan lab's image maths, pure so it is tested without a browser: the detector's
 * letterboxed input and the inverse of it, and the perspective warp of the four detected corners
 * onto the embedder's 320x448 input. Both models take ImageNet-normalised CHW floats.
 *
 * The contracts are the published models' (see the feasibility report): HanClinto's
 * ccgdetector-fastweb-single takes 384x384 and returns four corners normalised to its input, in no
 * fixed order around the card (measured on staging 2026-10-15: opposite corners side by side), so
 * every reader sorts them first (`sortCorners`, `cardCorners`, `quadArea`), and
 * the spike measured a centred letterbox slightly ahead of a stretch (mean IoU 0.984 to 0.979);
 * dhvazquez's embedder takes the warped card at 448 high by 320 wide.
 */

export type Pt = { x: number; y: number };

export const DETECTOR_SIZE = 384;
export const EMBED_W = 320;
export const EMBED_H = 448;
export const IMAGENET_MEAN = [0.485, 0.456, 0.406] as const;
export const IMAGENET_STD = [0.229, 0.224, 0.225] as const;
const MEAN = IMAGENET_MEAN;
const STD = IMAGENET_STD;

/** Where a frame of `w` x `h` sits inside the detector's square: its scale and offsets. */
export function letterbox(w: number, h: number, size = DETECTOR_SIZE) {
  const scale = size / Math.max(w, h);
  return { scale, dx: (size - w * scale) / 2, dy: (size - h * scale) / 2, dw: w * scale, dh: h * scale };
}

/** The detector's 8 outputs (normalised to its square) back in frame pixels. */
export function cornersFromDetector(out: ArrayLike<number>, w: number, h: number, size = DETECTOR_SIZE): Pt[] {
  const { scale, dx, dy } = letterbox(w, h, size);
  const pts: Pt[] = [];
  for (let i = 0; i < 4; i++) pts.push({ x: (out[2 * i] * size - dx) / scale, y: (out[2 * i + 1] * size - dy) / scale });
  return pts;
}

/**
 * TL, TR, BR, BL whatever order the points arrive in. The four are put in cyclic order by their
 * angle around the centroid (clockwise on screen, y pointing down), then rotated to start at the
 * one with the least x+y. Picking each corner by its own extremum instead can choose one point
 * twice on a tilted card, which leaves the homography degenerate.
 */
export function sortCorners(pts: Pt[]): Pt[] {
  const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
  const ring = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  let start = 0;
  for (let i = 1; i < ring.length; i++) if (ring[i].x + ring[i].y < ring[start].x + ring[start].y) start = i;
  return [...ring.slice(start), ...ring.slice(0, start)];
}

/**
 * The corners in the order the warp needs: TL, TR, BR, BL of the CARD, not of the frame. The index
 * was embedded from upright Scryfall scans, portrait, so the card's short edge must land on the
 * 320-wide side and its long edge on the 448-high side. `sortCorners` starts at the corner nearest
 * the frame's top left, which on a card turned past 45 degrees (landscape in the frame) is a corner
 * whose next edge is a LONG one; warping that order squeezes the card a quarter turn. So when the
 * first and third edges are the longer pair, the ring starts one corner later. Clockwise order is
 * kept, so the crop is never mirrored; whether a card turned a quarter turn reads upright or upside
 * down cannot be told from four corners, and is the same 180-degree ambiguity an upright card has.
 */
export function cardCorners(pts: Pt[]): Pt[] {
  const r = sortCorners(pts);
  const len = (a: Pt, b: Pt) => Math.hypot(b.x - a.x, b.y - a.y);
  const across = len(r[0], r[1]) + len(r[2], r[3]);
  const down = len(r[1], r[2]) + len(r[3], r[0]);
  return across > down ? [r[1], r[2], r[3], r[0]] : r;
}

/**
 * The 3x3 homography (row-major, h33 = 1) taking each `src[i]` to `dst[i]`, by solving the
 * standard 8x8 system with partial pivoting. Null when the points are degenerate.
 */
export function homography(src: Pt[], dst: Pt[]): number[] | null {
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i];
    const { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  }
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-10) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  return [...A.map((row, i) => row[8] / row[i]), 1];
}

export function applyHomography(H: number[], p: Pt): Pt {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}

/** An axis-aligned box of whole pixels inside a frame: its top-left corner and its size. */
export type Box = { x: number; y: number; w: number; h: number };

/** Whether four points, in the order given, run around a convex shape (every turn the same way). Pure. */
function convex(p: Pt[]): boolean {
  let sign = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length];
    const turn = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (turn === 0) continue;
    if (sign === 0) sign = Math.sign(turn);
    else if (Math.sign(turn) !== sign) return false;
  }
  return sign !== 0;
}

/**
 * The part of a `w` x `h` frame the warp of the card under `corners` reads: the corners' bounding box, from
 * `floor(min) - 1` to `ceil(max) + 1`, clamped to the frame (a corner the
 * detector put outside it included), so the pipeline reads back only that box rather than the whole frame. Every pixel
 * `warpToTensor` samples lies inside it: each output pixel's centre maps to a point inside the card's quad, and that
 * holds only for a convex quad (a homography onto a non-convex one folds, and samples outside it), so a non-convex or
 * non-finite set of corners answers null and the caller reads the whole frame, as it did before. The lowest texel read
 * is `floor(min - 0.5)` (the warp samples half a pixel back), which is `floor(min) - 1` or one higher: the low edge can
 * be exactly the lowest texel read (when frac(min) < 0.5), so it must not be tightened. The high edge's `+ 1` covers
 * the bilinear second texel, `ceil(max)` at most, with a pixel to spare for rounding. Pure.
 */
export function cardBounds(corners: Pt[], w: number, h: number): Box | null {
  if (corners.length !== 4 || !corners.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))) return null;
  if (!convex(sortCorners(corners))) return null;
  const xs = corners.map((p) => p.x), ys = corners.map((p) => p.y);
  const clamp = (v: number, hi: number) => Math.min(Math.max(v, 0), hi);
  const x0 = clamp(Math.floor(Math.min(...xs)) - 1, w - 1), x1 = clamp(Math.ceil(Math.max(...xs)) + 1, w - 1);
  const y0 = clamp(Math.floor(Math.min(...ys)) - 1, h - 1), y1 = clamp(Math.ceil(Math.max(...ys)) + 1, h - 1);
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * Warp the card under `corners` in an RGBA frame onto an `outW` x `outH` CHW tensor, ImageNet
 * normalised: each output pixel is mapped back into the frame and sampled bilinearly. `w` x `h` is
 * the whole frame, which the corners and the edge clamp are in; `rgba` holds only `region` of it
 * (the whole frame by default, `cardBounds` from the pipeline), so the sampling is the same sum on
 * the same pixels whichever was read back, only the index into `rgba` is offset.
 */
export function warpToTensor(
  rgba: ArrayLike<number>, w: number, h: number, corners: Pt[], outW = EMBED_W, outH = EMBED_H,
  region: Box = { x: 0, y: 0, w, h },
): Float32Array | null {
  const src = cardCorners(corners);
  const dst = [{ x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH }];
  const H = homography(dst, src);
  if (!H) return null;
  const plane = outW * outH;
  const out = new Float32Array(3 * plane);
  const { x: rx, y: ry, w: rw } = region;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      // pixel centres, as OpenCV's warpPerspective samples them
      const s = applyHomography(H, { x: x + 0.5, y: y + 0.5 });
      const sx = Math.min(Math.max(s.x - 0.5, 0), w - 1);
      const sy = Math.min(Math.max(s.y - 0.5, 0), h - 1);
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1);
      const fx = sx - x0, fy = sy - y0;
      const i = y * outW + x;
      // the four texels' offsets into `region`
      const r0 = (y0 - ry) * rw, r1 = (y1 - ry) * rw, c0 = x0 - rx, c1 = x1 - rx;
      for (let c = 0; c < 3; c++) {
        const a = rgba[(r0 + c0) * 4 + c], b = rgba[(r0 + c1) * 4 + c];
        const d = rgba[(r1 + c0) * 4 + c], e = rgba[(r1 + c1) * 4 + c];
        const v = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
        out[c * plane + i] = (v / 255 - MEAN[c]) / STD[c];
      }
    }
  }
  return out;
}

/**
 * An RGBA square (the detector's letterboxed input, drawn by a canvas) as normalised CHW floats. `into`, when it is the
 * right length, is filled and answered instead of a new array (`reusableBuffer`); every value is written, so nothing of
 * its last use is left in it.
 */
export function rgbaToTensor(rgba: ArrayLike<number>, w: number, h: number, into?: Float32Array): Float32Array {
  const plane = w * h;
  const out = into && into.length === 3 * plane ? into : new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) out[c * plane + i] = (rgba[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  }
  return out;
}

/**
 * One array of `size` floats, lent to one user at a time: `take` answers the kept array when nobody holds it, else a
 * new one (so two reads that overlap never share it), and `give` hands it back. Only the kept array is ever lent again;
 * an overflow array is the taker's for good. Pure, apart from the array.
 */
export function reusableBuffer(size: number) {
  const kept = new Float32Array(size);
  let lent = false;
  return {
    take(): Float32Array {
      if (lent) return new Float32Array(size);
      lent = true;
      return kept;
    },
    give(a: Float32Array): void {
      if (a === kept) lent = false;
    },
  };
}

/**
 * The card's area in square pixels, whatever order its four corners come in. The detector names
 * opposite corners next to each other, and the shoelace formula over that order measures a crossed
 * shape near zero, so the corners are put in order around the card first (`sortCorners`).
 */
export function quadArea(corners: Pt[]): number {
  const p = sortCorners(corners);
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i].x * q.y - q.x * p[i].y;
  }
  return Math.abs(a) / 2;
}
