import { describe, expect, it } from "vitest";
import { effectivePick, fileAddsCards, followUpShown, syncNext, syncNote, type SyncChoiceRead } from "./sync-choice-view";

const counts = { taken: 0, kept: 0, agreed: 0, unchanged: 0, conflicts: 0, undecided: 0, answeredFile: 0, ignored: 0 };
function read(over: {
  up?: number;
  stale?: "older" | "noNewer" | null;
  counts?: Partial<typeof counts>;
  conflicts?: { app: number; file: number }[];
  tokens?: number;
  tokensChange?: boolean;
  tokensChanged?: number;
  nothing?: boolean;
} = {}): SyncChoiceRead {
  const conflicts = (over.conflicts ?? []).map((c, i) => ({
    oracleId: `o${i}`, setCode: "lea", collectorNumber: "1", finish: "nonfoil" as const, key: `k${i}`, base: 1, ...c,
  }));
  return {
    detail: {
      unchanged: 0, up: over.up ?? 0, down: 0, leaving: 0, copiesBefore: 10, copiesAfter: 10,
      lists: { leaving: { total: 0, rows: [] }, down: { total: 0, rows: [] }, up: { total: 0, rows: [] } },
      newHoldings: 0, distinctCards: 0, overlap: { held: 0, of: 0 }, allOwned: false,
    },
    sync: {
      unavailable: null, pick: "everything", counts: { ...counts, ...over.counts },
      conflicts: { rows: conflicts, total: conflicts.length }, kept: { rows: [], total: 0 },
      stale: over.stale ?? null, tokens: { count: over.tokens ?? 0, copies: over.tokens ?? 0 },
      tokensChange: over.tokensChange ?? false, tokensChanged: over.tokensChanged ?? 0, nothing: over.nothing ?? false, planDigest: "d",
    },
  };
}

describe("fileAddsCards", () => {
  it("is a raise or a new holding the plain Sync takes, or a conflict whose file count is higher", () => {
    expect(fileAddsCards(read({ up: 1 }))).toBe(true);
    expect(fileAddsCards(read({ conflicts: [{ app: 1, file: 3 }] }))).toBe(true);
    expect(fileAddsCards(read({ conflicts: [{ app: 3, file: 1 }] }))).toBe(false);
    expect(fileAddsCards(read())).toBe(false);
  });
});

describe("the follow-up and the pick (S1, S2)", () => {
  it("is drawn only under an older-looking file that adds a card", () => {
    expect(followUpShown(read({ stale: "older", up: 3 }))).toBe(true);
    expect(followUpShown(read({ stale: "older" }))).toBe(false);
    expect(followUpShown(read({ stale: "noNewer", up: 3 }))).toBe(false);
    expect(followUpShown(read({ up: 3 }))).toBe(false);
  });

  it("runs the plain Sync unless the file looks older, the follow-up's pick when it is drawn, and only tokens when it is not", () => {
    expect(effectivePick(read({ up: 3 }), "additions")).toBe("everything");
    expect(effectivePick(read({ stale: "noNewer" }), "additions")).toBe("everything");
    expect(effectivePick(read({ stale: "older", up: 3 }), "additions")).toBe("additions");
    expect(effectivePick(read({ stale: "older", up: 3 }), "everything")).toBe("everything");
    // Never Everything by default for an older file that adds nothing: its removals are all it would take.
    expect(effectivePick(read({ stale: "older" }), "everything")).toBe("tokens");
  });
});

describe("syncNote and syncNext", () => {
  it("says nothing new, tokens only, keeps N, or does what Replace does", () => {
    expect(syncNote(read({ nothing: true }), "everything")).toEqual({ kind: "nothingNew" });
    expect(syncNote(read({ tokensChange: true, tokens: 114, counts: { kept: 121 } }), "everything")).toEqual({ kind: "tokensOnly", tokens: 114 });
    expect(syncNote(read({ counts: { taken: 18, kept: 121 } }), "everything")).toEqual({ kind: "keeps", cards: 121 });
    expect(syncNote(read({ counts: { taken: 18 } }), "everything")).toEqual({ kind: "keepsNone" });
    // A partial Sync is not what Replace does.
    expect(syncNote(read({ counts: { taken: 3 } }), "additions")).toBeNull();
  });

  it("leads in with the tokens, the additions, or the plain Sync", () => {
    expect(syncNext(read({ tokensChange: true, tokens: 114 }), "tokens")).toEqual({ kind: "tokens" });
    // The tokens it CHANGES (40), never the file's total (114).
    expect(syncNext(read({ up: 3, tokens: 114, tokensChanged: 40, counts: { taken: 3 } }), "additions")).toEqual({ kind: "adds", cards: 3, tokens: 40 });
    expect(syncNext(read({ counts: { taken: 3 } }), "everything")).toEqual({ kind: "sync" });
  });
});
