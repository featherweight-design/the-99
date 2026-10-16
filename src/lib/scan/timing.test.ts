import { describe, expect, it } from "vitest";
import { MAX_MS, MAX_SAMPLES, median, parseScanTiming, scanTimer } from "./timing";

describe("scanTimer", () => {
  it("times a card from its first frame to the answer, once per card in view", () => {
    const t = scanTimer("phone");
    t.frame(0, 100, false);
    t.frame(100, 500, true);
    t.frame(500, 900, true);
    t.answered(1300);
    t.answered(1700);
    expect(t.row()?.guess).toEqual([1200]);
    // the frame empties, and the next card is timed from its own first frame
    t.frame(1700, 1800, false);
    t.frame(1800, 2200, true);
    t.answered(2600);
    expect(t.row()?.guess).toEqual([1200, 800]);
  });
  it("does not time an answer with no card in view", () => {
    const t = scanTimer("desk");
    t.frame(0, 100, false);
    t.answered(200);
    expect(t.row()?.guess).toEqual([]);
  });
  it("times a mode press to the next frame read, and an add", () => {
    const t = scanTimer("phone");
    t.frame(0, 100, false);
    t.modePressed(150);
    t.frame(100, 400, false);
    t.frame(400, 700, false);
    t.added(1000, 1250);
    t.reviewed(320.4);
    expect(t.row()).toEqual({ layout: "phone", frames: 3, read: 300, guess: [], add: [250], mode: [250], review: 320 });
  });
  it("answers no row for a scanner that read no frame, and caps every list", () => {
    const t = scanTimer("phone");
    expect(t.row()).toBeNull();
    for (let i = 0; i < MAX_SAMPLES + 5; i++) t.added(0, 10 ** 9);
    t.frame(0, 1, false);
    expect(t.row()?.add).toHaveLength(MAX_SAMPLES);
    expect(t.row()?.add[0]).toBe(MAX_MS);
  });
  it("rows round-trip through the route's parse", () => {
    const t = scanTimer("desk");
    t.frame(0, 250, true);
    t.answered(900);
    expect(parseScanTiming(JSON.parse(JSON.stringify(t.row())))).toEqual(t.row());
  });
});

describe("parseScanTiming", () => {
  const ok = { layout: "phone", frames: 3, read: null, guess: [1], add: [], mode: [], review: null };
  it("refuses anything the recorder never writes", () => {
    expect(parseScanTiming(ok)).toEqual(ok);
    for (const bad of [
      null, [], "x", { ...ok, layout: "tablet" }, { ...ok, frames: -1 }, { ...ok, frames: 1.5 }, { ...ok, read: MAX_MS + 1 },
      { ...ok, guess: ["1"] }, { ...ok, guess: Array(MAX_SAMPLES + 1).fill(1) }, { ...ok, extra: 1 }, { ...ok, review: "1" },
    ]) expect(parseScanTiming(bad)).toBeNull();
  });
  it("medians", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(3);
  });
});
