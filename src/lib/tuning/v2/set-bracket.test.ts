import { describe, expect, it } from "vitest";
import { setLines } from "./set-bracket";

const add = (id: string) => ({ id, addOracleId: `o-${id}`, cutOracleId: null });
const cut = (id: string) => ({ id, addOracleId: null, cutOracleId: `o-${id}` });

describe("setLines", () => {
  const rows = [add("a1"), add("a2"), cut("c1"), cut("c2")];
  it("returns the named lines, each on its own side", () => {
    expect(setLines(rows, ["a1", "a2"], ["c1", "c2"])).toEqual([add("a1"), add("a2"), cut("c1"), cut("c2")]);
  });
  it("matches ids whatever their case", () => {
    expect(setLines(rows, ["A1"], ["C1"])).toEqual([add("a1"), cut("c1")]);
  });
  it("refuses a line named on the other side, a missing line, or one named twice", () => {
    expect(setLines(rows, ["c1"], [])).toBeNull();
    expect(setLines(rows, ["a1"], ["a2"])).toBeNull();
    expect(setLines(rows, ["zz"], [])).toBeNull();
    expect(setLines(rows, ["a1", "a1"], [])).toBeNull();
  });
});
