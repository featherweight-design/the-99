import { describe, expect, it } from "vitest";
import { HALO_REACH, haloInsets, type HaloFractions } from "./halo";
import { haloAt } from "./pins";

// The browser's reading of `haloInsets`' CSS at one frame size: a % inset is of the frame's width (left, right) or height
// (top, bottom), `clamp` and `max` as CSS defines them, and an auto size under two insets never below 0.
function drawn(b: HaloFractions, W: number, H: number) {
  const css = haloInsets(b);
  const num = (s: string, size: number) => {
    const m = /^(?:clamp|max)\((\d+)px, (-?[\d.]+)%(?:, calc\(100% - (\d+)px\))?\)$/.exec(s);
    if (!m) throw new Error(`unexpected inset ${s}`);
    const [lo, pct, hiOff] = [Number(m[1]), (Number(m[2]) / 100) * size, m[3]];
    const v = Math.max(pct, lo);
    return hiOff === undefined ? v : Math.max(Math.min(v, size - Number(hiOff)), lo);
  };
  const left = num(css.left, W);
  const top = num(css.top, H);
  return { x: left, y: top, w: Math.max(0, W - num(css.right, W) - left), h: Math.max(0, H - num(css.bottom, H) - top) };
}

describe("haloInsets holds a tool card's halo 8px inside its frame (Small items 3 item 2)", () => {
  const TOP_OFF = { x: 0.0373, y: 0.488, w: 0.9627, h: 0.2197 };
  const boxes: HaloFractions[] = [
    TOP_OFF,
    { x: 0, y: 0, w: 1, h: 1 },
    { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
    { x: 0.3, y: 0.9, w: 0.4, h: 0.1 },
    { x: 1.2, y: 0.5, w: 0.1, h: 0.1 },
    { x: -0.1, y: -0.2, w: 0.5, h: 0.5 },
  ];
  const sizes = [[328, 218.7], [372, 248], [404, 269.3], [780, 520]];

  it("draws the same box as haloAt at every card width", () => {
    for (const b of boxes)
      for (const [W, H] of sizes) {
        const want = haloAt([b.x, b.y, b.w, b.h], W, H);
        const got = drawn(b, W, H);
        for (const k of ["x", "y", "w", "h"] as const) expect(got[k]).toBeCloseTo(want[k], 0);
      }
  });

  it("pulls Top off's box in off the right edge, and leaves a box already inside as it was", () => {
    const top = drawn(TOP_OFF, 328, 218.7);
    expect(top.x + top.w).toBeCloseTo(328 - HALO_REACH, 5);
    expect(haloInsets({ x: 0.1, y: 0.1, w: 0.2, h: 0.2 })).toEqual({
      left: "clamp(8px, 10%, calc(100% - 8px))",
      top: "clamp(8px, 10%, calc(100% - 8px))",
      right: "max(8px, 70%)",
      bottom: "max(8px, 70%)",
    });
  });
});
