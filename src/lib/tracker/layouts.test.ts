import { describe, expect, it } from "vitest";
import { drawnLayout, LAYOUTS, layoutById, layoutsFor, turned } from "./layouts";

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

  it("offers the same arrangements, by the same names and in the same order, on both devices (addendum R2)", () => {
    const names = (device: "phone" | "tablet", n: number) => layoutsFor(device, n).map((l) => l.label);
    for (const n of [2, 3, 4, 5, 6]) expect(names("phone", n), `${n} seats`).toEqual(names("tablet", n));
    expect(names("phone", 2)).toEqual(["Face to face"]);
    expect(names("phone", 3)).toEqual(["One at the end", "Along one side"]);
    expect(names("phone", 4)).toEqual(["Two and two", "One on each side"]);
    expect(names("phone", 5)).toEqual(["Three and two", "One at the end"]);
    expect(names("phone", 6)).toEqual(["Three and three", "Ends"]);
    const at = (id: string) => layoutById(id)!.cells.map((c) => [c.x, c.y, c.w, c.h, c.rot]);
    expect(at("tablet-4-around")).toEqual([[270, 452, 640, 358, 0], [10, 10, 250, 800, 90], [270, 10, 640, 358, 180], [920, 10, 250, 800, -90]]);
    expect(at("phone-5-sides")).toEqual([[6, 425, 155, 413, 90], [6, 6, 155, 413, 90], [229, 6, 155, 273, -90], [229, 285, 155, 274, -90], [229, 565, 155, 273, -90]]);
    expect(at("phone-5-end")).toEqual([[6, 648, 378, 190, 0], [6, 327, 155, 315, 90], [6, 6, 155, 315, 90], [229, 6, 155, 315, -90], [229, 327, 155, 315, -90]]);
    expect(at("phone-6-sides")).toEqual([[6, 565, 155, 273, 90], [6, 285, 155, 274, 90], [6, 6, 155, 273, 90], [229, 6, 155, 273, -90], [229, 285, 155, 274, -90], [229, 565, 155, 273, -90]]);
  });

  it("keeps a saved game's seats where they were: phone-6 is Ends with its cells, phone-5 resolves but is not offered", () => {
    const at = (id: string) => layoutById(id)!.cells.map((c) => [c.x, c.y, c.w, c.h, c.rot]);
    expect(layoutById("phone-6")?.label).toBe("Ends");
    expect(at("phone-6")).toEqual([[6, 648, 378, 190, 0], [6, 425, 155, 217, 90], [6, 202, 155, 217, 90], [6, 6, 378, 190, 180], [229, 202, 155, 217, -90], [229, 425, 155, 217, -90]]);
    expect(at("phone-5")).toEqual([[6, 648, 378, 190, 0], [6, 425, 155, 217, 90], [6, 202, 155, 217, 90], [6, 6, 378, 190, 180], [229, 202, 155, 440, -90]]);
    expect(layoutsFor("phone", 5).map((l) => l.id)).not.toContain("phone-5");
  });

  it("never overlaps two seats of one layout", () => {
    for (const l of LAYOUTS)
      l.cells.forEach((a, i) =>
        l.cells.slice(i + 1).forEach((b) => {
          const overlaps = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          expect(overlaps, `${l.id} seats overlap`).toBe(false);
        }),
      );
  });

  it("has unique ids and offers 2 to 6 seats on both devices", () => {
    expect(new Set(LAYOUTS.map((l) => l.id)).size).toBe(LAYOUTS.length);
    for (const device of ["phone", "tablet"] as const) for (const n of [2, 3, 4, 5, 6]) expect(layoutsFor(device, n).length).toBeGreaterThan(0);
  });

  it("lays tablet 2 (T1) and tablet 3 (T2, T3) out as drawn", () => {
    const at = (id: string) => layoutById(id)!.cells.map((c) => [c.x, c.y, c.w, c.h, c.rot]);
    expect(at("tablet-2")).toEqual([[10, 452, 1160, 358, 0], [10, 10, 1160, 358, 180]]);
    expect(at("tablet-3-end")).toEqual([[10, 452, 900, 358, 0], [10, 10, 900, 358, 180], [920, 10, 250, 800, -90]]);
    expect(at("tablet-3-side")).toEqual([[790, 84, 380, 726, 0], [400, 84, 380, 726, 0], [10, 84, 380, 726, 0]]);
    expect(layoutById("tablet-3-side")!.spine).toEqual({ x: 10, y: 10, w: 1160, h: 64 });
  });

  it("turns a layout a quarter as the upright boards draw it: V3 one way, V5 the other", () => {
    const cells = (l: ReturnType<typeof turned>) => l.cells.map((c) => [c.x, c.y, c.w, c.h, c.rot]);
    const v3 = turned(layoutById("tablet-3-end")!, 1);
    expect(v3.canvas).toEqual({ w: 820, h: 1180 });
    expect(cells(v3)).toEqual([[10, 10, 358, 900, 90], [452, 10, 358, 900, -90], [10, 920, 800, 250, 0]]);
    expect(v3.spine).toEqual({ x: 378, y: 10, w: 64, h: 900 });
    const v5 = turned(layoutById("tablet-5")!, 3);
    expect(cells(v5)).toEqual([[452, 595, 358, 575, -90], [10, 790, 358, 380, 90], [10, 400, 358, 380, 90], [10, 10, 358, 380, 90], [452, 10, 358, 575, -90]]);
    expect(v5.spine).toEqual({ x: 378, y: 10, w: 64, h: 1160 });
    for (const l of LAYOUTS) for (const q of [0, 1, 2, 3] as const) {
      const t = turned(l, q);
      for (const c of t.cells) expect(c.x >= 0 && c.y >= 0 && c.x + c.w <= t.canvas.w && c.y + c.h <= t.canvas.h, `${l.id} turned ${q}`).toBe(true);
    }
    expect(turned(turned(layoutById("tablet-6")!, 1), 3)).toEqual(layoutById("tablet-6"));
  });

  it("keeps a game saved on the old tablet fallback where its seats were", () => {
    // Before tablet 2 and 3 existed a tablet fell back to the phone's layouts. phone-2's seats face the same edges as
    // tablet-2's, in the same order, so it draws as tablet-2; phone-3's have no tablet twin and draw as before, unturned.
    const ids = (id: string, q: 0 | 1) => drawnLayout(layoutById(id)!, "tablet", q);
    expect(ids("phone-2", 0).id).toBe("tablet-2");
    expect(ids("phone-2", 0).cells.map((c) => c.rot)).toEqual([0, 180]);
    expect(ids("phone-3-end", 0)).toBe(layoutById("phone-3-end"));
    expect(ids("phone-3-side", 0)).toBe(layoutById("phone-3-side"));
    expect(ids("phone-2", 1)).toBe(layoutById("phone-2"));
    expect(drawnLayout(layoutById("tablet-4")!, "tablet", 1)).toEqual(turned(layoutById("tablet-4")!, 1));
  });
  it("finds a layout by id", () => {
    expect(layoutById("phone-4-around")?.seats).toBe(4);
    expect(layoutById("nope")).toBeUndefined();
  });
});
