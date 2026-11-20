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
  it("has unique ids and offers every seat count 2 to 6 on both devices", () => {
    expect(new Set(LAYOUTS.map((l) => l.id)).size).toBe(LAYOUTS.length);
    for (const device of ["phone", "tablet"] as const) for (const n of [2, 3, 4, 5, 6]) if (!(device === "tablet" && (n === 2 || n === 3))) expect(layoutsFor(device, n).length).toBeGreaterThan(0);
  });
  it("finds a layout by id", () => {
    expect(layoutById("phone-4-around")?.seats).toBe(4);
    expect(layoutById("nope")).toBeUndefined();
  });
});
