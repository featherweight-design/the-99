import { describe, expect, it } from "vitest";
import { cutStands } from "./cuts-state";

describe("cutStands", () => {
  it("stands while the list holds fewer copies than when the cut was made", () => {
    expect(cutStands({ quantityBefore: 1, quantityNow: 0 })).toBe(true);
    // A Cut removes one copy: a Forest cut from 2 to 1 is still in the deck, and the cut stands.
    expect(cutStands({ quantityBefore: 2, quantityNow: 1 })).toBe(true);
  });

  it("does not stand once a copy is put back by hand", () => {
    expect(cutStands({ quantityBefore: 1, quantityNow: 1 })).toBe(false);
    expect(cutStands({ quantityBefore: 2, quantityNow: 2 })).toBe(false);
  });

  it("does not stand when nothing says it was cut", () => {
    expect(cutStands({ quantityBefore: null, quantityNow: 0 })).toBe(false);
    expect(cutStands({})).toBe(false);
  });
});
