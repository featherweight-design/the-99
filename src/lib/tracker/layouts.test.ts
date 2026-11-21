import { describe, expect, it } from "vitest";
import { LAYOUTS, layoutById, layoutsFor } from "./layouts";

describe("layouts", () => {
  it("gives every layout one cell per seat, inside its canvas", () => {
    for (const l of LAYOUTS) {
      expect(l.cells).toHaveLength(l.seats);
      for (const c of l.cells) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.x + c.w).toBeLessThanOrEqual(l.canvas.w);
        expect(c.y + c.h).toBeLessThanOrEqual(l.canvas.h);
      }
    }
  });
  it("puts every layout's centre strip inside its canvas and over no seat", () => {
    for (const l of LAYOUTS) {
      const r = l.spine;
      expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= l.canvas.w && r.y + r.h <= l.canvas.h, l.id).toBe(true);
      for (const c of l.cells) {
        const overlaps = r.x < c.x + c.w && c.x < r.x + r.w && r.y < c.y + c.h && c.y < r.y + r.h;
        expect(overlaps, `${l.id} spine over a seat`).toBe(false);
      }
    }
  });

  it("lays tablet 2+2 (F18) and 3+2 (F19) out as drawn", () => {
    const at = (id: string) => layoutById(id)!.cells.map((c) => [c.x, c.y, c.w, c.rot]);
    expect(at("tablet-4")).toEqual([[10, 452, 575, 0], [10, 10, 575, 180], [595, 10, 575, 180], [595, 452, 575, 0]]);
    expect(at("tablet-5")).toEqual([[10, 452, 575, 0], [10, 10, 380, 180], [400, 10, 380, 180], [790, 10, 380, 180], [595, 452, 575, 0]]);
  });

  it("has unique ids and offers phone 2 to 6 and tablet 4 to 6", () => {
    expect(new Set(LAYOUTS.map((l) => l.id)).size).toBe(LAYOUTS.length);
    for (const device of ["phone", "tablet"] as const) for (const n of [2, 3, 4, 5, 6]) if (!(device === "tablet" && (n === 2 || n === 3))) expect(layoutsFor(device, n).length).toBeGreaterThan(0);
  });
  it("finds a layout by id", () => {
    expect(layoutById("phone-4-around")?.seats).toBe(4);
    expect(layoutById("nope")).toBeUndefined();
  });
});
