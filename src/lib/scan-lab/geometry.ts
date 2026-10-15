/**
 * The card-scan lab's image maths, pure so it is tested without a browser: the detector's
 * letterboxed input and the inverse of it, and the perspective warp of the four detected corners
 * onto the embedder's 320x448 input. Both models take ImageNet-normalised CHW floats.
 *
 * The contracts are the published models' (see the feasibility report): HanClinto's
 * ccgdetector-fastweb-single takes 384x384 and returns TL,TR,BR,BL normalised to its input, and
 * the spike measured a centred letterbox slightly ahead of a stretch (mean IoU 0.984 to 0.979);
 * dhvazquez's embedder takes the warped card at 448 high by 320 wide.
 */

export type Pt = { x: number; y: number };

export const DETECTOR_SIZE = 384;
export const EMBED_W = 320;
export const EMBED_H = 448;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

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

/** TL, TR, BR, BL whatever order the points arrive in (TL has the least x+y). */
export function sortCorners(pts: Pt[]): Pt[] {
  const by = (f: (p: Pt) => number, max: boolean) =>
    pts.reduce((best, p) => ((max ? f(p) > f(best) : f(p) < f(best)) ? p : best));
  return [by((p) => p.x + p.y, false), by((p) => p.y - p.x, false), by((p) => p.x + p.y, true), by((p) => p.y - p.x, true)];
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

/**
 * Warp the card under `corners` in an RGBA frame onto an `outW` x `outH` CHW tensor, ImageNet
 * normalised: each output pixel is mapped back into the frame and sampled bilinearly.
 */
export function warpToTensor(
  rgba: ArrayLike<number>, w: number, h: number, corners: Pt[], outW = EMBED_W, outH = EMBED_H,
): Float32Array | null {
  const src = sortCorners(corners);
  const dst = [{ x: 0, y: 0 }, { x: outW, y: 0 }, { x: outW, y: outH }, { x: 0, y: outH }];
  const H = homography(dst, src);
  if (!H) return null;
  const plane = outW * outH;
  const out = new Float32Array(3 * plane);
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
      for (let c = 0; c < 3; c++) {
        const a = rgba[(y0 * w + x0) * 4 + c], b = rgba[(y0 * w + x1) * 4 + c];
        const d = rgba[(y1 * w + x0) * 4 + c], e = rgba[(y1 * w + x1) * 4 + c];
        const v = (a * (1 - fx) + b * fx) * (1 - fy) + (d * (1 - fx) + e * fx) * fy;
        out[c * plane + i] = (v / 255 - MEAN[c]) / STD[c];
      }
    }
  }
  return out;
}

/** An RGBA square (the detector's letterboxed input, drawn by a canvas) as normalised CHW floats. */
export function rgbaToTensor(rgba: ArrayLike<number>, w: number, h: number): Float32Array {
  const plane = w * h;
  const out = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let c = 0; c < 3; c++) out[c * plane + i] = (rgba[i * 4 + c] / 255 - MEAN[c]) / STD[c];
  }
  return out;
}

/** Twice the signed area: positive for a quad wound clockwise in screen coordinates. */
export function quadArea(p: Pt[]): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i].x * q.y - q.x * p[i].y;
  }
  return Math.abs(a) / 2;
}
