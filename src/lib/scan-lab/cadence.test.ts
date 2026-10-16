import { describe, expect, it } from "vitest";
import type { Reading } from "../scan/reading";
import type { Display } from "../scan/steady";
import { CADENCE_GAP_MS, CADENCE_MS, MAX_CADENCE_FRAMES, cadenceDone, logFrame, parseCadence, pressedDuringRun, startCadence } from "./cadence";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const card = (...ids: number[]): Reading => ({
  kind: "card", crop: new Float32Array(3), margin: 0.0312345, agreed: 1, committed: false, detMs: 1, embMs: 1, matchMs: 1, totalMs: 3,
  guesses: ids.map((n, i) => ({ oracleId: id(n), name: `Card ${n}`, score: 0.6 - i * 0.01 })),
});
const NONE: Reading = { kind: "none", detMs: 1, totalMs: 1 };
const showing = (r: Reading | null): Display => ({ reading: r, changedAt: 0, before: null });

describe("the cadence log", () => {
  it("logs each frame's top 3, its margin and what the screen showed, with no image", () => {
    const run = logFrame(startCadence(1000), card(1, 2, 3, 4), showing(card(2)), 1000);
    expect(run.frames).toEqual([
      { t: 0, top: [{ oracleId: id(1), score: 0.6 }, { oracleId: id(2), score: 0.59 }, { oracleId: id(3), score: 0.58 }], margin: 0.0312, shown: id(2), unsure: false },
    ]);
    expect(JSON.stringify(run.frames)).not.toMatch(/crop/);
  });

  it("logs a frame with no card, and an unsure screen, as what they are", () => {
    const run = logFrame(startCadence(0), NONE, showing(null), 0);
    expect(run.frames[0]).toEqual({ t: 0, top: [], margin: null, shown: null, unsure: true });
  });

  it("logs every frame a phone reads, and only drops one that came under the floor after the last", () => {
    let run = startCadence(0);
    for (const t of [0, 150, 300, 450, 600]) run = logFrame(run, card(1), showing(card(1)), t);
    expect(run.frames.map((f) => f.t)).toEqual([0, 150, 300, 450, 600]);
    run = startCadence(0);
    for (const t of [0, 20, 60, 90, 140]) run = logFrame(run, card(1), showing(card(1)), t);
    expect(run.frames.map((f) => f.t)).toEqual([0, 60, 140]);
    expect(CADENCE_GAP_MS).toBe(50);
  });

  it("stops after its 30 seconds", () => {
    let run = startCadence(0);
    run = logFrame(run, card(1), showing(card(1)), CADENCE_MS - 1);
    expect(cadenceDone(run, CADENCE_MS - 1)).toBe(false);
    expect(cadenceDone(run, CADENCE_MS)).toBe(true);
    expect(logFrame(run, card(1), showing(card(1)), CADENCE_MS + 500)).toBe(run);
    expect(MAX_CADENCE_FRAMES).toBe(600);
  });
});

describe("pressedDuringRun", () => {
  it("keeps no frame for a tap pressed inside a run, even when its save lands after the run ended", () => {
    const running = startCadence(1000);
    expect(pressedDuringRun(1500, running, null)).toBe(true);
    expect(pressedDuringRun(900, running, null)).toBe(false);
    // The run ended at 31,000; the tap was pressed at 30,900 and saves later, with no run open.
    expect(pressedDuringRun(30_900, null, { start: 1000, end: 31_000 })).toBe(true);
    expect(pressedDuringRun(31_100, null, { start: 1000, end: 31_000 })).toBe(false);
  });
});

describe("parseCadence", () => {
  const frame = { t: 0, top: [{ oracleId: id(1), score: 0.6 }], margin: 0.03, shown: id(1), unsure: false };

  it("keeps a well-formed run", () => {
    expect(parseCadence({ indexVersion: "all-20261014", frames: [frame] })).toEqual({ indexVersion: "all-20261014", frames: [frame] });
  });

  it("refuses an empty run, too many frames, a bad id, a fourth guess and a stray field type", () => {
    expect(parseCadence({ indexVersion: "v", frames: [] })).toBeNull();
    expect(parseCadence({ indexVersion: "v", frames: Array(MAX_CADENCE_FRAMES + 1).fill(frame) })).toBeNull();
    expect(parseCadence({ indexVersion: "v", frames: [{ ...frame, shown: "Grizzled Angler" }] })).toBeNull();
    expect(parseCadence({ indexVersion: "v", frames: [{ ...frame, top: Array(4).fill(frame.top[0]) }] })).toBeNull();
    expect(parseCadence({ indexVersion: "v", frames: [{ ...frame, unsure: "no" }] })).toBeNull();
    expect(parseCadence({ indexVersion: "a b", frames: [frame] })).toBeNull();
  });

  it("drops any field it does not know, so nothing but readings is stored", () => {
    const parsed = parseCadence({ indexVersion: "v", frames: [{ ...frame, frame: "AAAA" }] });
    expect(parsed?.frames[0]).not.toHaveProperty("frame");
  });
});
