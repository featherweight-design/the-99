import { describe, expect, it } from "vitest";
import { cosine, maxAbsDiff, MAX_SPIKE_FRAMES, parseSpike } from "./spike";

const times = { create: [400, 900], warm: [120, 300] };
const backends = { kind: "backends", gpu: true, adapter: "apple common-3", ua: "Mozilla/5.0", wasm: times, webgpu: times, error: null };
const frame = { wd: 150, we: 250, gd: 20, ge: 40, cos: 0.99998, corner: 0.0004 };
const run = { kind: "run", resultId: "11111111-1111-4111-8111-111111111111", first: { oracleId: "22222222-2222-4222-8222-222222222222", margin: 0.12, ms: 140 }, frames: 6 };

describe("parseSpike", () => {
  it("keeps each row the lab writes, as written", () => {
    for (const row of [backends, { ...backends, gpu: false, adapter: null, webgpu: null, error: "no WebGPU adapter" }, { kind: "frames", frames: [frame, { ...frame, we: null, ge: null, cos: null }] }, run]) {
      expect(parseSpike(JSON.parse(JSON.stringify(row)))).toEqual(row);
    }
  });
  it("refuses anything else", () => {
    for (const bad of [
      null, [], { kind: "other" },
      { ...backends, extra: 1 }, { ...backends, wasm: { create: [1], warm: [1, 2] } }, { ...backends, ua: "x".repeat(301) },
      { kind: "frames", frames: [] }, { kind: "frames", frames: Array(MAX_SPIKE_FRAMES + 1).fill(frame) },
      { kind: "frames", frames: [{ ...frame, wd: -1 }] }, { kind: "frames", frames: [{ ...frame, cos: 2 }] },
      { ...run, resultId: "nope" }, { ...run, first: { ...run.first, oracleId: "x" } }, { ...run, frames: 1.5 },
    ]) expect(parseSpike(bad)).toBeNull();
  });
});

describe("cosine and maxAbsDiff", () => {
  it("measure agreement between two backends' outputs", () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([0, 0], [1, 0])).toBeNull();
    expect(maxAbsDiff([1, 2, 3], [1, 2.5, 2])).toBe(1);
  });
});
