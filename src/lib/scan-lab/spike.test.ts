import { describe, expect, it } from "vitest";
import { advanceRun, CORNER_DIVERGED, cosine, maxAbsDiff, MAX_SPIKE_FRAMES, parseSpike, RUN_GAP_FRAMES } from "./spike";

const times = { create: [400, 900], warm: [120, 300] };
const backends = { kind: "backends", gpu: true, adapter: "apple common-3", ua: "Mozilla/5.0", wasm: times, webgpu: times, error: null };
const frame = { wd: 150, we: 250, gd: 20, ge: 40, cos: 0.99998, corner: 0.0004 };
const run = { kind: "run", resultId: "11111111-1111-4111-8111-111111111111", first: { answered: true, oracleId: "22222222-2222-4222-8222-222222222222", margin: 0.12, ms: 140 }, frames: 6 };

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
      { ...run, resultId: "nope" }, { ...run, first: { ...run.first, oracleId: "x" } }, { ...run, frames: 1.5 }, { ...run, first: { oracleId: null, margin: null, ms: 1 } },
    ]) expect(parseSpike(bad)).toBeNull();
  });
});

describe("cosine and maxAbsDiff", () => {
  it("measure agreement between two backends' outputs", () => {
    expect(cosine([1, 0], [1, 0])).toBe(1);
    expect(cosine([1, 0], [0, 1])).toBe(0);
    expect(cosine([0, 0], [1, 0])).toBeNull();
    expect(maxAbsDiff([1, 2, 3], [1, 2.5, 2])).toBe(1);
    // a backend that overflows still leaves a frame the route keeps, marked diverged
    expect(maxAbsDiff([NaN, 0], [0, 0])).toBe(CORNER_DIVERGED);
    expect(maxAbsDiff([Infinity], [0])).toBe(CORNER_DIVERGED);
  });
});

describe("advanceRun", () => {
  const A = new Float32Array([1, 0, 0]);
  const A2 = new Float32Array([0.95, 0.31, 0]);
  const B = new Float32Array([0, 1, 0]);
  it("asks once per card: on its first frame, not on its later ones or across one flicker", () => {
    let asked = 0;
    const ask = () => ++asked;
    let run = advanceRun(null, A, ask);
    run = advanceRun(run, A2, ask);
    run = advanceRun(run, null, ask);
    run = advanceRun(run, A, ask);
    expect(asked).toBe(1);
    expect(run).toMatchObject({ first: 1, frames: 3 });
  });
  it("starts a new run after empty frames, and on a card swapped in with no empty frame", () => {
    let asked = 0;
    const ask = () => ++asked;
    let run = advanceRun(null, A, ask);
    for (let i = 0; i < RUN_GAP_FRAMES; i++) run = advanceRun(run, null, ask);
    expect(run).toBeNull();
    run = advanceRun(run, A, ask);
    run = advanceRun(run, B, ask);
    expect(asked).toBe(3);
    expect(run).toMatchObject({ first: 3, frames: 1 });
  });
  it("never changes the run it was given, so a snapshot at a press keeps its count", () => {
    const run = advanceRun(null, A, () => 1)!;
    advanceRun(run, A2, () => 2);
    expect(run.frames).toBe(1);
  });
});
