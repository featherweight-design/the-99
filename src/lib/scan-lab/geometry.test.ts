import { describe, expect, it } from "vitest";
import { applyHomography, cardCorners, cornersFromDetector, homography, letterbox, sortCorners, warpToTensor } from "./geometry";

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
