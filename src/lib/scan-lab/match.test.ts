import { describe, expect, it } from "vitest";
import { parseResult } from "./result";
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
  it("bounds a quantised cosine to 1, so a near-identical match is still a score the endpoint keeps", () => {
    // a unit vector alternating 1 and 0.603, quantised by its own scale, reads about 1.0015 against itself
    const dim = 256;
    const q = normalise(Float32Array.from({ length: dim }, (_, i) => (i % 2 ? 0.603 : 1)));
    const scale = Math.max(...q) / 127;
    const meta: IndexMeta = { version: "t", model: "m", dim, rows: 1, oracles: [["a", "A"]], rowOracle: [0] };
    const bin = new ArrayBuffer(dim + 4);
    new Int8Array(bin, 0, dim).set(Array.from(q, (v) => Math.round(v / scale)));
    new Float32Array(bin, dim, 1)[0] = scale;
    const [g] = topOracles(parseIndex(meta, bin), q, 1);
    expect(g.score).toBeLessThanOrEqual(1);
    expect(g.score).toBeGreaterThan(0.999);
    const stored = parseResult({ guessOracleId: null, correct: true, score: g.score, margin: 0.1, latencyMs: 5, agreedFrames: 0, indexVersion: "t" });
    expect(stored?.score).toBe(g.score);
  });
});
