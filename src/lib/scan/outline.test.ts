import { afterEach, describe, expect, it, vi } from "vitest";
import { CLOSER_BELOW, OUTLINE_HOLD_MS, createOutlineStore, outlineInBox, outlineOf, outlineShare, outlineStill, type Outline } from "./outline";

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
    // Told twice: as it appeared and as it went. The card back at the same place was nothing new to draw.
    expect(seen).toHaveBeenCalledTimes(2);
  });

  /** `o` with every corner moved by `dx`, `dy` picture pixels. */
  const moved = (from: Outline, dx: number, dy: number): Outline => ({
    ...from, corners: from.corners.map((p) => ({ x: p.x + dx / from.width, y: p.y + dy / from.height })),
  });

  it("tells nobody when a shown card moved under a pixel, and keeps the outline it published", () => {
    const s = createOutlineStore();
    const seen = vi.fn();
    s.subscribe(seen);
    s.show(o);
    s.show(moved(o, 0.6, -0.6));
    expect(seen).toHaveBeenCalledTimes(1);
    expect(s.get()).toBe(o);
    // A drift is measured from the outline published, so it lands once it adds up to a pixel.
    s.show(moved(o, 1.2, 0));
    expect(seen).toHaveBeenCalledTimes(2);
    expect(s.get()!.corners[0].x).toBeCloseTo(0.4 + 1.2 / 1000);
  });

  it("measures the move in the drawn box's pixels once the view has measured it", () => {
    const s = createOutlineStore();
    const seen = vi.fn();
    s.subscribe(seen);
    // A 1000px picture drawn into a 2000px box: a 0.6px move in the picture is 1.2px on screen.
    s.setBox(2000, 2000);
    s.show(o);
    s.show(moved(o, 0.6, 0));
    expect(seen).toHaveBeenCalledTimes(2);
    // Into a 400x800 box (scaled by 0.8): 1.1px in the picture from the outline published (0.6 over) is 0.88px on
    // screen, under a pixel.
    s.setBox(400, 800);
    s.show(moved(o, 1.7, 0));
    expect(seen).toHaveBeenCalledTimes(2);
  });

  it("tells its subscribers when the card comes back after it went, at the very same place", () => {
    vi.useFakeTimers();
    const s = createOutlineStore();
    const seen = vi.fn();
    s.subscribe(seen);
    s.show(o);
    s.hide();
    vi.advanceTimersByTime(OUTLINE_HOLD_MS);
    expect(s.get()).toBeNull();
    s.show(moved(o, 0.1, 0.1));
    expect(seen).toHaveBeenCalledTimes(3);
    expect(s.get()).not.toBeNull();
  });

  it("calls off a hold under way even when it tells nobody: a still card stays shown", () => {
    vi.useFakeTimers();
    const s = createOutlineStore();
    const seen = vi.fn();
    s.subscribe(seen);
    s.show(o);
    s.hide();
    s.show(moved(o, 0.2, 0));
    vi.advanceTimersByTime(OUTLINE_HOLD_MS * 2);
    expect(s.get()).toBe(o);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("tells its subscribers when the camera picture changes size, however still the card", () => {
    const s = createOutlineStore();
    const seen = vi.fn();
    s.subscribe(seen);
    s.show(o);
    s.show({ ...o, width: 1280, height: 720 });
    expect(seen).toHaveBeenCalledTimes(2);
  });
});

describe("outlineStill", () => {
  const o = outlineOf(PX, 1000, 1000, 1000, 1000);
  it("is false for a move of over a pixel on any one corner, either way", () => {
    const one = { ...o, corners: o.corners.map((p, i) => (i === 2 ? { x: p.x, y: p.y - 1.5 / 1000 } : p)) };
    expect(outlineStill(o, one, null)).toBe(false);
    expect(outlineStill(o, { ...o, corners: o.corners.map((p) => ({ ...p })) }, null)).toBe(true);
  });
  it("is false where the box has no size to draw in", () => {
    expect(outlineStill(o, o, { w: 0, h: 0 })).toBe(false);
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
