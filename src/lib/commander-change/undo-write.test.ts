import { describe, expect, it } from "vitest";
import { undoRoom } from "./undo-write";

const body = (n: number) => new Set(Array.from({ length: n }, (_, i) => `c${i}`));

describe("undoRoom", () => {
  it("lets the cut come back when the 99 has a slot", () => {
    expect(undoRoom(98, "cut", body(98))).toBeNull();
  });
  it("refuses a cut that is back in the 99", () => {
    expect(undoRoom(98, "c3", body(98))).toBe("changed");
  });
  it("refuses a cut that would take the deck past 100", () => {
    expect(undoRoom(99, "cut", body(99))).toBe("full");
  });
  it("with no cut, lets a body of 99 or fewer go back to a single", () => {
    expect(undoRoom(99, null, body(99))).toBeNull();
    expect(undoRoom(100, null, body(100))).toBe("full");
  });
});
