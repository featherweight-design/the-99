import { describe, expect, it } from "vitest";
import { centre, edgePoint, placeLabels, placeRow, rowLabelWidth, type Box } from "./guide-place";

const bounds: Box = { x: 0, y: 0, w: 390, h: 800 };
const hit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe("placeLabels", () => {
  it("puts a label on its ideal spot when it is free", () => {
    const out = placeLabels(bounds, [], [{ id: "a", size: { w: 100, h: 40 }, ideal: { x: 200, y: 300 } }]);
    const a = out.get("a")!;
    expect(Math.abs(centre(a).x - 200)).toBeLessThanOrEqual(6);
    expect(Math.abs(centre(a).y - 300)).toBeLessThanOrEqual(6);
  });
  it("keeps clear of a cutout and of an earlier label", () => {
    const cut: Box = { x: 150, y: 280, w: 100, h: 40 };
    const out = placeLabels(bounds, [cut], [
      { id: "a", size: { w: 100, h: 40 }, ideal: { x: 200, y: 300 } },
      { id: "b", size: { w: 100, h: 40 }, ideal: { x: 200, y: 300 } },
    ]);
    const a = out.get("a")!;
    const b = out.get("b")!;
    expect(hit(a, cut)).toBe(false);
    expect(hit(b, cut)).toBe(false);
    expect(hit(a, b)).toBe(false);
  });
  it("stays inside the bounds", () => {
    const a = placeLabels(bounds, [], [{ id: "a", size: { w: 100, h: 40 }, ideal: { x: -500, y: 9000 } }]).get("a")!;
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.y + a.h).toBeLessThanOrEqual(800);
  });
  it("prefers spots inside its home box", () => {
    const home: Box = { x: 0, y: 600, w: 390, h: 200 };
    const a = placeLabels(bounds, [], [{ id: "a", size: { w: 100, h: 40 }, ideal: { x: 200, y: 590 }, home }]).get("a")!;
    expect(a.y).toBeGreaterThanOrEqual(600);
  });
  it("takes the least-overlapping spot when nothing is free", () => {
    // A wall across the whole field but for a 60px strip down the right edge, which a 100px label can only half fill.
    const wall: Box = { x: 0, y: 0, w: 330, h: 800 };
    const a = placeLabels(bounds, [wall], [{ id: "a", size: { w: 100, h: 40 }, ideal: { x: 100, y: 300 } }]).get("a")!;
    expect(a.x + a.w).toBeGreaterThan(330);
    expect(a.x).toBeGreaterThan(200);
  });
});

describe("placeLabels, a label larger than the field", () => {
  it("is pinned to the field's corner, never placed outside the bounds", () => {
    const a = placeLabels(bounds, [], [{ id: "a", size: { w: 500, h: 40 }, ideal: { x: 200, y: 300 } }]).get("a")!;
    expect(a.x).toBeGreaterThanOrEqual(bounds.x);
  });
});

describe("edgePoint", () => {
  it("is where the ray from the box centre toward the point leaves the box", () => {
    const p = edgePoint({ x: 0, y: 0, w: 100, h: 40 }, { x: 300, y: 20 });
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(20);
  });
});

describe("the labelled row (What's what, T1)", () => {
  const wide: Box = { x: 0, y: 0, w: 1180, h: 820 };
  const buttons: Box[] = Array.from({ length: 7 }, (_, i) => ({ x: 360 + i * 62, y: 380, w: 56, h: 56 }));

  it("narrows the labels until all seven fit across", () => {
    expect(rowLabelWidth(wide, 7, 200)).toBeLessThan(200);
    expect(rowLabelWidth(wide, 7, 200) * 7 + 6 * 6 + 12).toBeLessThanOrEqual(wide.w);
    expect(rowLabelWidth(bounds, 1, 148)).toBe(148);
  });

  it("puts every label in one row, in the buttons' order, none over another", () => {
    const w = rowLabelWidth(wide, 7, 200);
    const boxes = placeRow(wide, buttons, buttons.map(() => ({ w, h: 74 })), -1, 40)!;
    expect(boxes).toHaveLength(7);
    for (let i = 0; i < 7; i++) {
      expect(boxes[i].y).toBe(boxes[0].y);
      expect(boxes[i].y + boxes[i].h).toBeLessThanOrEqual(380 - 40 + 0.5);
      if (i > 0) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].x + boxes[i - 1].w);
    }
    expect(boxes[0].x).toBeGreaterThanOrEqual(6);
    expect(boxes[6].x + boxes[6].w).toBeLessThanOrEqual(wide.w - 6);
  });

  it("gives up when the row would leave the canvas", () => {
    expect(placeRow(wide, buttons, buttons.map(() => ({ w: 200, h: 74 })), -1, 40)).toBeNull();
    expect(placeRow(wide, buttons, buttons.map(() => ({ w: 150, h: 74 })), -1, 400)).toBeNull();
  });
});

describe("a leader a label would draw", () => {
  it("keeps clear of a fixed leader that would cross it", () => {
    const to = { x: 200, y: 600 };
    const out = placeLabels(bounds, [], [{ id: "a", size: { w: 100, h: 40 }, ideal: { x: 200, y: 400 }, to }], [[{ x: 190, y: 330 }, { x: 190, y: 470 }]]);
    const a = out.get("a")!;
    expect(a.x < 190 && 190 < a.x + a.w && a.y < 470 && 330 < a.y + a.h).toBe(false);
  });
});
