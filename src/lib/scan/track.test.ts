// The dwell under every scanner screen, with its own idea of "the same": here, a number read as a card, and a pair of
// unit vectors compared by cosine, the shape a scanner matching on the server reads frame to frame.
import { describe, expect, it } from "vitest";
import { DWELL_MS, LOSE_MS, nextTrack, startTrack, type Tracked } from "./track";

const eq = (a: number, b: number) => a === b;
function run(values: [number, number][], same = eq): Tracked<number> {
  let s = startTrack<number>(0);
  for (const [v, at] of values) s = nextTrack(s, v, at, same);
  return s;
}

describe("nextTrack", () => {
  it("settles on a value only once it has held for the dwell", () => {
    expect(run([[1, 0], [1, DWELL_MS - 1]]).value).toBeNull();
    expect(run([[1, 0], [1, DWELL_MS]]).value).toBe(1);
  });

  it("never lets a flicker replace the settled value", () => {
    const s = run([[1, 0], [1, DWELL_MS], [2, DWELL_MS + 100], [1, DWELL_MS + 200], [2, DWELL_MS + 300]]);
    expect(s.value).toBe(1);
  });

  it("replaces the settled value with one that holds, and keeps the one before", () => {
    const s = run([[1, 0], [1, DWELL_MS], [2, 1000], [2, 1000 + DWELL_MS]]);
    expect(s.value).toBe(2);
    expect(s.before).toBe(1);
    expect(s.changedAt).toBe(1000 + DWELL_MS);
  });

  it("falls to unsure when the settled value goes unread for LOSE_MS and nothing holds", () => {
    const s = run([[1, 0], [1, DWELL_MS], [2, DWELL_MS + 10], [3, DWELL_MS + 20], [4, DWELL_MS + LOSE_MS]]);
    expect(s.value).toBeNull();
    expect(s.before).toBe(1);
  });

  it("reads 'the same' by the caller's rule: two embeddings of one card agree, another card's do not", () => {
    type V = number[];
    const cos = (a: V, b: V) => a.reduce((n, x, i) => n + x * b[i], 0);
    const sameCard = (a: V, b: V) => cos(a, b) >= 0.9;
    const card = (x: number): V => [Math.cos(x), Math.sin(x)];
    let s = startTrack<V>(0);
    // one card, read a little differently on every frame, settles
    for (const [x, at] of [[0, 0], [0.1, 300], [0.05, DWELL_MS]] as const) s = nextTrack(s, card(x), at, sameCard);
    expect(s.value).not.toBeNull();
    const settled = s.value;
    // a different card (a quarter turn away) does not replace it until it holds
    s = nextTrack(s, card(1.5), 1000, sameCard);
    expect(s.value).toBe(settled);
    s = nextTrack(s, card(1.55), 1000 + DWELL_MS, sameCard);
    expect(s.value).toEqual(card(1.55));
  });
});
