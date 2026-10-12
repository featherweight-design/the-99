import { describe, expect, it } from "vitest";
import { diffAgainstPredecessor, railDiff } from "./versions";

// v1 against v0 (precons R3 K10), below the loaders: the rail's counts and the open diff's rows.
const q = (oracleId: string, quantity = 1) => ({ oracleId, quantity });
const v0 = [q("sol-ring"), q("arcane-signet"), q("ulamog"), q("forest", 10)];
const v1 = [q("sol-ring"), q("ulamog"), q("kozilek"), q("forest", 9)];

describe("railDiff", () => {
  it("counts a linked deck's v1 against v0", () => {
    const diff = railDiff(v1, null, v0)!;
    expect(diff.adds.map((c) => c.oracleId)).toEqual(["kozilek"]);
    expect(diff.removes.map((c) => c.oracleId).sort()).toEqual(["arcane-signet", "forest"]);
  });

  it("draws no diff for an unlinked v1", () => {
    expect(railDiff(v1, null, null)).toBeNull();
  });

  it("counts a later version against the version before it, never v0", () => {
    const diff = railDiff(v1, [q("sol-ring"), q("ulamog"), q("forest", 9)], v0)!;
    expect(diff.adds.map((c) => c.oracleId)).toEqual(["kozilek"]);
    expect(diff.removes).toEqual([]);
  });
});

describe("diffAgainstPredecessor", () => {
  it("diffs v1 against v0's cards and counts what it kept, commanders held", () => {
    const origin = {
      cards: [],
      nonBasic: ["sol-ring", "arcane-signet", "ulamog", "ulalek"],
      commanders: ["ulalek"],
    };
    const r = diffAgainstPredecessor(v1, v0, origin);
    expect(r.adds.map((c) => c.oracleId)).toEqual(["kozilek"]);
    expect(r.removes.map((c) => c.oracleId).sort()).toEqual(["arcane-signet", "forest"]);
    expect(r.origin).toEqual({ kept: 3, of: 4 });
  });

  it("carries no kept line against a previous version", () => {
    expect(diffAgainstPredecessor(v1, v0, null).origin).toBeNull();
  });
});
