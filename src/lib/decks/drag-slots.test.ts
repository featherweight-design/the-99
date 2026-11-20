import { describe, expect, it } from "vitest";
import { clampDy, rowShift, slotAt, slotTop, type DragGeometry } from "./drag-slots";

// Five rows, 80 tall with a 10 gap, the list starting at 100.
const geo = (from: number): DragGeometry => ({
  tops: [100, 190, 280, 370, 460],
  heights: [80, 80, 80, 80, 80],
  from,
  startPageY: 140 + from * 90,
  olTop: 100,
  gap: 10,
});

describe("slotAt", () => {
  it("stays in its own slot until the centre passes a neighbour's midpoint, down and up", () => {
    expect(slotAt(geo(1), 0)).toBe(1);
    expect(slotAt(geo(1), 89)).toBe(1); // centre 319: row 2's midpoint is 320
    expect(slotAt(geo(1), 91)).toBe(2); // centre 321 passes it
    expect(slotAt(geo(1), -89)).toBe(1);
    expect(slotAt(geo(1), -91)).toBe(0); // centre 139 passes row 0's midpoint (140)
  });
  it("counts the rows passed, by 1, 2 and 4 slots, either way", () => {
    expect(slotAt(geo(0), 91)).toBe(1);
    expect(slotAt(geo(0), 181)).toBe(2);
    expect(slotAt(geo(0), 361)).toBe(4);
    expect(slotAt(geo(4), -91)).toBe(3);
    expect(slotAt(geo(4), -361)).toBe(0);
  });
});

describe("clampDy", () => {
  it("holds the row inside the list, past either end", () => {
    expect(clampDy(geo(2), -9999)).toBe(100 - 280);
    expect(clampDy(geo(2), 9999)).toBe(460 + 80 - 280 - 80);
    expect(clampDy(geo(2), 25)).toBe(25);
    expect(slotAt(geo(0), clampDy(geo(0), -500))).toBe(0);
    expect(slotAt(geo(4), clampDy(geo(4), 500))).toBe(4);
  });
});

describe("slotTop and rowShift", () => {
  it("rests the lifted row where the gap opened, and slides exactly the rows between", () => {
    const g = geo(1);
    expect(slotTop(g, 3)).toBe(370 + 80 - 80); // down: the third slot's bottom, less the row's height
    expect(slotTop(g, 0)).toBe(100);
    expect([0, 1, 2, 3, 4].map((i) => rowShift(g, i, 3, 123))).toEqual([0, 123, -90, -90, 0]);
    expect([0, 1, 2, 3, 4].map((i) => rowShift(geo(3), i, 1, -77))).toEqual([0, 90, 90, -77, 0]);
    expect([0, 1, 2, 3, 4].map((i) => rowShift(g, i, 1, 5))).toEqual([0, 5, 0, 0, 0]);
  });
});
