import { describe, expect, it } from "vitest";
import {
  applyHomography, cardBounds, cardCorners, cornersFromDetector, homography, letterbox, quadArea, reusableBuffer, rgbaToTensor, sortCorners,
  warpToTensor, type Box, type Pt,
} from "./geometry";

describe("scan-lab geometry", () => {
  it("solves a homography that maps every source corner onto its target", () => {
    const src = [{ x: 10, y: 20 }, { x: 300, y: 35 }, { x: 290, y: 420 }, { x: 5, y: 400 }];
    const dst = [{ x: 0, y: 0 }, { x: 320, y: 0 }, { x: 320, y: 448 }, { x: 0, y: 448 }];
    const H = homography(src, dst)!;
    src.forEach((p, i) => {
      const q = applyHomography(H, p);
      expect(q.x).toBeCloseTo(dst[i].x, 6);
      expect(q.y).toBeCloseTo(dst[i].y, 6);
    });
  });

  it("refuses degenerate corners", () => {
    const p = { x: 1, y: 1 };
    expect(homography([p, p, p, p], [p, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 5 }])).toBeNull();
  });

  it("sorts corners TL, TR, BR, BL from any order (the pose model starts at BL)", () => {
    const [tl, tr, br, bl] = [{ x: 0, y: 0 }, { x: 10, y: 1 }, { x: 11, y: 14 }, { x: -1, y: 13 }];
    expect(sortCorners([bl, tl, tr, br])).toEqual([tl, tr, br, bl]);
  });

  it("sorts a tilted card's corners without picking one point twice", () => {
    const [tl, tr, br, bl] = [{ x: 100, y: 20 }, { x: 160, y: 90 }, { x: 80, y: 180 }, { x: 30, y: 100 }];
    expect(sortCorners([br, bl, tr, tl])).toEqual([tl, tr, br, bl]);
    const dst = [{ x: 0, y: 0 }, { x: 320, y: 0 }, { x: 320, y: 448 }, { x: 0, y: 448 }];
    expect(homography(dst, sortCorners([bl, br, tl, tr]))).not.toBeNull();
  });

  it("maps the detector's letterboxed output back to frame pixels", () => {
    const { scale, dx, dy } = letterbox(1280, 720);
    expect(dx).toBe(0);
    expect(dy).toBeCloseTo((384 - 720 * scale) / 2, 6);
    const corners = cornersFromDetector([0, dy / 384, 1, dy / 384, 1, 1 - dy / 384, 0, 1 - dy / 384], 1280, 720);
    expect(corners[0].x).toBeCloseTo(0, 4);
    expect(corners[0].y).toBeCloseTo(0, 4);
    expect(corners[2].x).toBeCloseTo(1280, 4);
    expect(corners[2].y).toBeCloseTo(720, 4);
  });

  it("warps a frame onto the embedder's input, ImageNet normalised", () => {
    // a 4x4 RGBA frame, left half white and right half black; warp the whole frame to 2x2
    const w = 4, h = 4;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = x < 2 ? 255 : 0;
      rgba.set([v, v, v, 255], (y * w + x) * 4);
    }
    const t = warpToTensor(rgba, w, h, [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: 0, y: 4 }], 2, 2)!;
    expect(t.length).toBe(12);
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229, 4); // red plane, left column: white
    expect(t[1]).toBeCloseTo((0 - 0.485) / 0.229, 4); // red plane, right column: black
  });
  it("puts a card turned past 45 degrees short edge first, so its long edge lands on the 448 side", () => {
    const len = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(b.x - a.x, b.y - a.y);
    for (const deg of [0, 30, 60, 90, 120, -60, -90]) {
      const t = (deg * Math.PI) / 180;
      // a 320x448 card turned by deg about (500, 500), handed over in a scrambled order
      const card = [[-160, -224], [160, -224], [160, 224], [-160, 224]].map(([x, y]) => ({
        x: 500 + x * Math.cos(t) - y * Math.sin(t),
        y: 500 + x * Math.sin(t) + y * Math.cos(t),
      }));
      const c = cardCorners([card[2], card[0], card[3], card[1]]);
      expect(len(c[0], c[1])).toBeCloseTo(320, 6);
      expect(len(c[1], c[2])).toBeCloseTo(448, 6);
    }
  });

  it("warps a card lying landscape in the frame onto a portrait crop, not a squeezed one", () => {
    // an 8x4 frame that is all card, top half white and bottom half black: the card's long edge is
    // horizontal, so its top-to-bottom stripes must run left to right across the 2x4 portrait crop
    const w = 8, h = 4;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = y < 2 ? 255 : 0;
      rgba.set([v, v, v, 255], (y * w + x) * 4);
    }
    const t = warpToTensor(rgba, w, h, [{ x: 0, y: 0 }, { x: 8, y: 0 }, { x: 8, y: 4 }, { x: 0, y: 4 }], 2, 4)!;
    const white = (1 - 0.485) / 0.229, black = (0 - 0.485) / 0.229;
    for (let y = 0; y < 4; y++) {
      expect(t[y * 2]).toBeCloseTo(white, 4); // red plane, left column
      expect(t[y * 2 + 1]).toBeCloseTo(black, 4); // red plane, right column
    }
  });
});

describe("quadArea", () => {
  it("measures the card whatever order its corners come in, the detector's included", () => {
    const tl = { x: 100, y: 100 }, tr = { x: 420, y: 100 }, br = { x: 420, y: 548 }, bl = { x: 100, y: 548 };
    const area = 320 * 448;
    expect(quadArea([tl, tr, br, bl])).toBeCloseTo(area);
    // The detector's order: opposite corners side by side, a crossed shape to the shoelace formula.
    expect(quadArea([tl, br, tr, bl])).toBeCloseTo(area);
    expect(quadArea([br, tl, bl, tr])).toBeCloseTo(area);
  });
});

// The card's box read back in place of the whole frame (scan client wins, 2026-11-14).
describe("cardBounds and the warp from it", () => {
  const W = 200, H = 150;
  /** A frame of fixed noise, so every texel differs from its neighbours and a wrong index shows. */
  const frame = (() => {
    const a = new Uint8ClampedArray(W * H * 4);
    let seed = 7;
    for (let i = 0; i < a.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      a[i] = seed % 256;
    }
    return a;
  })();
  /** What `getImageData` answers for `box`: its rows, copied out of the frame. */
  const readBack = (b: Box) => {
    const out = new Uint8ClampedArray(b.w * b.h * 4);
    for (let y = 0; y < b.h; y++) out.set(frame.subarray(((b.y + y) * W + b.x) * 4, ((b.y + y) * W + b.x + b.w) * 4), y * b.w * 4);
    return out;
  };
  const sameWarp = (corners: Pt[]) => {
    const box = cardBounds(corners, W, H)!;
    expect(box).not.toBeNull();
    const whole = warpToTensor(frame, W, H, corners, 40, 56)!;
    const part = warpToTensor(readBack(box), W, H, corners, 40, 56, box)!;
    expect(part).toEqual(whole);
    return box;
  };

  it("warps a tilted card from its box to exactly the floats the whole frame gives", () => {
    const box = sameWarp([{ x: 40.3, y: 20.7 }, { x: 150.2, y: 35.1 }, { x: 140.8, y: 130.4 }, { x: 30.6, y: 118.9 }]);
    // floor(30.6) - 1 to ceil(150.2) + 1, and floor(20.7) - 1 to ceil(130.4) + 1: a pixel past the corners each way.
    expect(box).toEqual({ x: 29, y: 19, w: 124, h: 114 });
  });

  it("whichever order the detector names the corners in", () => {
    sameWarp([{ x: 140.8, y: 130.4 }, { x: 40.3, y: 20.7 }, { x: 30.6, y: 118.9 }, { x: 150.2, y: 35.1 }]);
  });

  it("clamps the box to the frame where corners lie off it, and the warp still matches", () => {
    const box = sameWarp([{ x: -10, y: -5.5 }, { x: 120, y: -8 }, { x: 215.2, y: 160 }, { x: -3, y: 140 }]);
    expect(box).toEqual({ x: 0, y: 0, w: W, h: H });
    const edge = sameWarp([{ x: 150, y: 100.2 }, { x: 199.6, y: 101 }, { x: 199.4, y: 149.7 }, { x: 151, y: 149.5 }]);
    expect(edge).toEqual({ x: 149, y: 99, w: W - 149, h: H - 99 });
  });

  it("is a column at the frame's edge for a card wholly past it, and the warp still matches", () => {
    const box = sameWarp([{ x: 210, y: 10 }, { x: 260, y: 12 }, { x: 258, y: 80 }, { x: 212, y: 78 }]);
    expect(box).toEqual({ x: W - 1, y: 9, w: 1, h: 73 });
  });

  it("is null for corners that are no convex card, or not numbers, so the whole frame is read", () => {
    // A dart: one corner pushed inside the other three.
    expect(cardBounds([{ x: 10, y: 10 }, { x: 100, y: 10 }, { x: 40, y: 40 }, { x: 10, y: 100 }], W, H)).toBeNull();
    expect(cardBounds([{ x: NaN, y: 10 }, { x: 100, y: 10 }, { x: 100, y: 100 }, { x: 10, y: 100 }], W, H)).toBeNull();
    expect(cardBounds([{ x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }, { x: 5, y: 5 }], W, H)).toBeNull();
  });
});

describe("the detector's reused input", () => {
  const SIZE = 3 * 2 * 2;
  const rgba = (v: number) => new Uint8ClampedArray(2 * 2 * 4).fill(v);

  it("fills the array it is handed, every value, and answers it", () => {
    const into = new Float32Array(SIZE).fill(99);
    const out = rgbaToTensor(rgba(0), 2, 2, into);
    expect(out).toBe(into);
    expect(out).toEqual(rgbaToTensor(rgba(0), 2, 2));
    // An array of another size is not used.
    const wrong = new Float32Array(SIZE + 1);
    expect(rgbaToTensor(rgba(0), 2, 2, wrong)).not.toBe(wrong);
  });

  it("never lends the kept array to a second read while the first still holds it", () => {
    const buf = reusableBuffer(SIZE);
    // Read A's input is in its detector run.
    const a = rgbaToTensor(rgba(10), 2, 2, buf.take());
    const held = Float32Array.from(a);
    // Read B overlaps it (a chosen photo during the live loop): it gets an array of its own.
    const b = rgbaToTensor(rgba(250), 2, 2, buf.take());
    expect(b).not.toBe(a);
    expect(a).toEqual(held);
    // B's array going back is not A's: the kept one is still lent.
    buf.give(b);
    expect(buf.take()).not.toBe(a);
    // A's run settled: the next read reuses it.
    buf.give(a);
    expect(buf.take()).toBe(a);
  });
});
