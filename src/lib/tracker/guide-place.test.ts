import { describe, expect, it } from "vitest";
import { centre, edgePoint, placeLabels, type Box } from "./guide-place";

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

describe("edgePoint", () => {
  it("is where the ray from the box centre toward the point leaves the box", () => {
    const p = edgePoint({ x: 0, y: 0, w: 100, h: 40 }, { x: 300, y: 20 });
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(20);
  });
});
