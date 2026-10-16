import { describe, expect, it } from "vitest";
import type { Reading } from "./reading";
import { CHANGE_GRACE_MS, DWELL_MS, LOSE_MS, nextSteady, startSteady, tapTarget, type SteadyState } from "./steady";

const card = (n: number): Reading => ({
  kind: "card", crop: new Float32Array(3), margin: 0.01, agreed: 0, committed: false, detMs: 1, embMs: 1, matchMs: 1, totalMs: 3,
  guesses: [{ oracleId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, name: `Card ${n}`, score: 0.5 }],
});
const ANGLER = card(1);
const OTHER = card(2);
const NONE: Reading = { kind: "none", detMs: 1, totalMs: 1 };
const name = (s: SteadyState) => (s.reading?.kind === "card" ? s.reading.guesses[0].name : s.reading?.kind ?? null);

/** Feeds readings 200ms apart (a phone's frame rate) and returns the state after each. */
function run(frames: Reading[], start = startSteady(0), t0 = 0) {
  let s = start;
  return frames.map((r, i) => (s = nextSteady(s, r, t0 + 200 * (i + 1))));
}

describe("the steady display", () => {
  it("says it is unsure until a first guess has held for the dwell", () => {
    const states = run([ANGLER, ANGLER, ANGLER, ANGLER, ANGLER]);
    // 200 to 1000ms: the run began at 200, so it holds from 900.
    expect(states.map(name)).toEqual([null, null, null, null, "Card 1"]);
  });

  it("never changes for a one-frame flicker", () => {
    const steady = run([ANGLER, ANGLER, ANGLER, ANGLER, ANGLER]).at(-1)!;
    const after = run([OTHER, ANGLER, OTHER, ANGLER, OTHER, ANGLER, ANGLER], steady, 1000);
    expect(after.map(name)).toEqual(Array(7).fill("Card 1"));
    expect(after.at(-1)!.changedAt).toBe(steady.changedAt);
  });

  it("changes once a new top-1 has held, unbroken, for the dwell", () => {
    const steady = run([ANGLER, ANGLER, ANGLER, ANGLER, ANGLER]).at(-1)!;
    const after = run([OTHER, OTHER, OTHER, OTHER, OTHER], steady, 1000);
    expect(after.map(name)).toEqual(["Card 1", "Card 1", "Card 1", "Card 1", "Card 2"]);
    expect(after.at(-1)!.before).toBe(steady.reading);
    expect(after.at(-1)!.changedAt - 1200).toBeGreaterThanOrEqual(DWELL_MS);
  });

  it("needs a frame with no card to hold too before it clears the screen", () => {
    const steady = run([ANGLER, ANGLER, ANGLER, ANGLER, ANGLER]).at(-1)!;
    expect(run([NONE, ANGLER], steady, 1000).map(name)).toEqual(["Card 1", "Card 1"]);
    expect(run([NONE, NONE, NONE, NONE, NONE], steady, 1000).at(-1)!.reading).toBe(NONE);
  });

  it("falls to unsure when its guess has gone unseen and nothing else has held", () => {
    const steady = run([ANGLER, ANGLER, ANGLER, ANGLER, ANGLER]).at(-1)!;
    const flicker = Array.from({ length: 10 }, (_, i) => card(10 + (i % 2)));
    const after = run(flicker, steady, 1000);
    const firstUnsure = after.findIndex((s) => s.reading === null);
    expect(firstUnsure).toBeGreaterThan(-1);
    expect(1000 + 200 * (firstUnsure + 1) - 1000).toBeGreaterThanOrEqual(LOSE_MS);
    expect(after[firstUnsure].before).toBe(steady.reading);
  });

  it("keeps each frame's own figures while the guess holds", () => {
    const steady = run([ANGLER, ANGLER, ANGLER, ANGLER, ANGLER]).at(-1)!;
    const fresh = { ...ANGLER, totalMs: 99 } as Reading;
    expect(nextSteady(steady, fresh, 1200).reading).toBe(fresh);
  });
});

describe("tapTarget", () => {
  const display = { reading: OTHER, changedAt: 10_000, before: ANGLER };

  it("records a press 300ms after a change against the guess shown before it", () => {
    expect(tapTarget(display, 10_300)).toEqual({ reading: ANGLER, shown: OTHER, changedMsBeforeTap: 300, pressedAt: 10_300 });
  });

  it("records the guess on screen once the change is older than the grace", () => {
    expect(tapTarget(display, 10_000 + CHANGE_GRACE_MS)).toEqual({ reading: OTHER, shown: OTHER, changedMsBeforeTap: CHANGE_GRACE_MS, pressedAt: 10_000 + CHANGE_GRACE_MS });
  });
});
