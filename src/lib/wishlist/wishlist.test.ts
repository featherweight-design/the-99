import { describe, expect, it } from "vitest";
import { cleanQuantity, wantFloor } from "./wishlist";

describe("cleanQuantity", () => {
  it("takes a whole number from 1 to 99, as a number or a form string", () => {
    expect([1, 99, "3", " 7 "].map(cleanQuantity)).toEqual([1, 99, 3, 7]);
  });
  it("refuses everything else", () => {
    expect([0, 100, 1.5, -1, "", "x", null, undefined, NaN].map(cleanQuantity)).toEqual(Array(9).fill(null));
  });
});

describe("wantFloor", () => {
  it("floors a step down on an unmet line at one more than held, so the line stays", () => {
    // Want 4, the collection grew to 3 while the screen still read 1: − sends 3, and the line stands at 4.
    expect(wantFloor(3, 3, 4)).toBe(4);
    expect(wantFloor(1, 1, 2)).toBe(2);
  });
  it("lets a step down above the floor through", () => {
    expect(wantFloor(2, 1, 3)).toBe(2);
  });
  it("leaves a first want, and a line the collection already reaches, to the collected rule", () => {
    expect(wantFloor(1, 1, null)).toBe(1);
    expect(wantFloor(2, 3, 2)).toBe(2);
  });
});
