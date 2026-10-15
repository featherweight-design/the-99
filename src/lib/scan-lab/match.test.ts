import { describe, expect, it } from "vitest";
import { agreement, normalise, parseIndex, topOracles, type IndexMeta } from "./match";

function index() {
  const meta: IndexMeta = {
    version: "t1", model: "test", dim: 2, rows: 3,
    oracles: [["a", "Alpha"], ["b", "Beta"]],
    rowOracle: [0, 1, 1], // Beta has a front and a back face
  };
  const bin = new ArrayBuffer(3 * 2 + 3 * 4);
  new Int8Array(bin, 0, 6).set([127, 0, 0, 127, -127, 0]);
  const scales = new Float32Array([1 / 127, 1 / 127, 1 / 127]);
  new Uint8Array(bin, 6).set(new Uint8Array(scales.buffer));
  return parseIndex(meta, bin);
}

describe("scan-lab match", () => {
  it("scores each oracle by its best row and ranks oracles, not rows", () => {
    const g = topOracles(index(), normalise(new Float32Array([0, 1])), 5);
    expect(g.map((x) => x.name)).toEqual(["Beta", "Alpha"]);
    expect(g[0].score).toBeCloseTo(1, 5);
  });

  it("refuses an index whose sizes disagree", () => {
    const meta: IndexMeta = { version: "x", model: "m", dim: 2, rows: 1, oracles: [["a", "A"]], rowOracle: [0] };
    expect(() => parseIndex(meta, new ArrayBuffer(3))).toThrow();
  });

  it("agrees only on the same answer over enough frames, each clearing the margin", () => {
    const f = (id: string, margin = 0.1) => ({ oracleId: id, margin });
    expect(agreement([f("a"), f("a")], 3)).toBeNull();
    expect(agreement([f("b"), f("a"), f("a"), f("a")], 3)).toBe("a");
    expect(agreement([f("a"), f("a", 0.001), f("a")], 3, 0.02)).toBeNull();
    expect(agreement([f("a"), f("b"), f("a")], 3)).toBeNull();
  });
});
