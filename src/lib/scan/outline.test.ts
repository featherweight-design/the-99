import { afterEach, describe, expect, it, vi } from "vitest";
import { CLOSER_BELOW, OUTLINE_HOLD_MS, createOutlineStore, outlineInBox, outlineOf, outlineShare } from "./outline";

const PX = [{ x: 400, y: 300 }, { x: 600, y: 300 }, { x: 600, y: 700 }, { x: 400, y: 700 }];

describe("outlineOf", () => {
  it("puts the corners clockwise from the top left, as shares of the picture", () => {
    // The detector may list them in any order.
    const o = outlineOf([PX[2], PX[0], PX[3], PX[1]], 1000, 1000, 1920, 1080);
    expect(o.corners).toEqual([{ x: 0.4, y: 0.3 }, { x: 0.6, y: 0.3 }, { x: 0.6, y: 0.7 }, { x: 0.4, y: 0.7 }]);
    expect([o.width, o.height]).toEqual([1920, 1080]);
  });
});

describe("outlineShare", () => {
  it("is the share of the picture the card covers, whichever way the corners run", () => {
    const o = outlineOf(PX, 1000, 1000, 1000, 1000);
    expect(outlineShare(o)).toBeCloseTo(0.08);
    expect(outlineShare({ ...o, corners: [...o.corners].reverse() })).toBeCloseTo(0.08);
    expect(outlineShare(o)).toBeLessThan(CLOSER_BELOW);
  });
});

describe("outlineInBox", () => {
  const o = outlineOf(PX, 1000, 1000, 1000, 1000);
  it("follows object-fit: cover: scaled to fill, centred, the overflow cut", () => {
    // Tall box: the square picture is scaled by 0.8 and 200px of it falls off each side.
    expect(outlineInBox(o, 400, 800)).toEqual([{ x: 120, y: 240 }, { x: 280, y: 240 }, { x: 280, y: 560 }, { x: 120, y: 560 }]);
    // Wide box: scaled by 1.2 and 100px falls off the top and bottom.
    const wide = outlineInBox(o, 1200, 1000)!;
    expect(wide[0].x).toBeCloseTo(480);
    expect(wide[0].y).toBeCloseTo(0.3 * 1200 - 100);
  });
  it("is null where the picture or the box has no size", () => {
    expect(outlineInBox(o, 0, 800)).toBeNull();
    expect(outlineInBox({ ...o, width: 0 }, 400, 800)).toBeNull();
  });
});

describe("createOutlineStore", () => {
  afterEach(() => vi.useRealTimers());
  const o = outlineOf(PX, 1000, 1000, 1000, 1000);

  it("tells its subscribers when a card appears, and keeps it through one missed frame", () => {
    vi.useFakeTimers();
    const s = createOutlineStore();
    const seen = vi.fn();
    s.subscribe(seen);
    s.show(o);
    expect(s.get()).toBe(o);
    s.hide();
    vi.advanceTimersByTime(OUTLINE_HOLD_MS - 1);
    expect(s.get()).toBe(o);
    // The card is back before the hold ran out: it never went.
    s.show(o);
    vi.advanceTimersByTime(OUTLINE_HOLD_MS * 2);
    expect(s.get()).toBe(o);
    s.hide();
    vi.advanceTimersByTime(OUTLINE_HOLD_MS);
    expect(s.get()).toBeNull();
    expect(seen).toHaveBeenCalledTimes(3);
  });

  it("goes at once when cleared, and a stopped subscriber hears nothing", () => {
    const s = createOutlineStore();
    const seen = vi.fn();
    const off = s.subscribe(seen);
    s.show(o);
    off();
    s.clear();
    expect(s.get()).toBeNull();
    expect(seen).toHaveBeenCalledTimes(1);
  });
});
