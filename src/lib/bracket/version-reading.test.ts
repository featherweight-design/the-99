import { describe, expect, it } from "vitest";

import { versionComparison } from "./version-reading";
import type { Bracket } from "./types";

const RANGES: readonly Bracket[][] = [[1, 2], [4, 5]];
const SINGLES: readonly Bracket[][] = [[2], [3], [4]];

describe("versionComparison", () => {
  // CARDINALITY IS THE ONLY AXIS. A range permits; a single bracket reads as — in the sentence
  // and in the mark label — and the split pill appears only where there are two marks.
  it("says permits for a range and readsAs for one bracket", () => {
    for (const permits of RANGES) {
      const c = versionComparison({ permits, declared: null }, null);
      expect(c.now.verb).toBe("permits");
      expect(c.now.split).toBe(true);
    }
    for (const permits of SINGLES) {
      const c = versionComparison({ permits, declared: null }, null);
      expect(c.now.verb).toBe("readsAs");
      expect(c.now.split).toBe(false);
    }
  });

  // DIRECTION IS GONE. The same shape covers a deck tuned up and one tuned down — one sentence,
  // no "moved past" and no "brought inside", because a comparison of two readings has no
  // direction to be wrong about.
  it("reads the same whichever way the deck moved", () => {
    const up = versionComparison({ permits: [4, 5], declared: null }, { permits: [2], declared: 2 });
    const down = versionComparison({ permits: [2], declared: null }, { permits: [4, 5], declared: 5 });
    expect(up.now.verb).toBe("permits");
    expect(down.now.verb).toBe("readsAs");
    // Neither carries anything naming a direction: the shape is symmetric.
    expect(Object.keys(up)).toEqual(Object.keys(down));
  });

  // THE ASK FOLLOWS ONLY WHEN THIS VERSION IS A RANGE — whatever the last one was. A single
  // bracket has said everything there is to say.
  it("asks again only when this version is a range", () => {
    for (const permits of RANGES) {
      expect(versionComparison({ permits, declared: null }, { permits: [3], declared: null })
        .stillAsking).toBe(true);
    }
    for (const permits of SINGLES) {
      expect(versionComparison({ permits, declared: null }, { permits: [4, 5], declared: 5 })
        .stillAsking).toBe(false);
    }
  });

  // A PREVIOUS VERSION WITH NO DECLARATION STILL READS. The row compares READINGS, not answers,
  // so dropping it would leave the comparison with one side and no reason to exist.
  it("keeps a previous version that was never declared", () => {
    const c = versionComparison({ permits: [3], declared: null }, { permits: [1, 2], declared: null });
    expect(c.was).toEqual({ verb: "permits", permits: [1, 2], declared: null, split: true });
  });

  // No previous version at all — a first commit, or a brew. The row has nothing to compare and
  // says so with null rather than with an empty reading that would draw a blank side.
  it("has no previous reading when there is no previous version", () => {
    expect(versionComparison({ permits: [3], declared: 3 }, null).was).toBeNull();
  });

  it("carries both declarations through untouched", () => {
    const c = versionComparison({ permits: [4, 5], declared: 4 }, { permits: [1, 2], declared: 1 });
    expect(c.now.declared).toBe(4);
    expect(c.was?.declared).toBe(1);
  });
});
