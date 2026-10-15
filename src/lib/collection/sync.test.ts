import { describe, expect, it } from "vitest";
import { collectionItemKey, type CollectionItemIdentity } from "./key";
import {
  answerFor, holdingDistance, changedTokenCount, missingFromAnchor, nothingToSync, parseSyncOptions, planSync, quantitiesOf, STALE_REVERSAL_SHARE, staleness, SYNC_REVIEW_CAP,
  type SyncAnswers, type SyncHolding, type SyncPick,
} from "./sync";
import { planTokenWrite } from "../tokens/ownership";

const oracle = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const id = (n: number): CollectionItemIdentity => ({ oracleId: oracle(n), setCode: "lea", collectorNumber: "1", finish: "nonfoil" });
const key = (n: number) => collectionItemKey(id(n));
const hold = (n: number, quantity: number, condition: string | null = "NM", scryfallId: string | null = "s1"): SyncHolding =>
  ({ ...id(n), quantity, scryfallId, condition, name: `Card ${n}` });

/** One holding (card 1) with base `b`, app `a` and file `f`; 0 means no row on that side. */
function one(b: number, a: number, f: number, pick: SyncPick = "everything", answers?: SyncAnswers) {
  return planSync({
    base: new Map(b > 0 ? [[key(1), b]] : []),
    app: new Map(a > 0 ? [[key(1), hold(1, a, "LP", "app")]] : []),
    file: f > 0 ? [hold(1, f, "NM", "file")] : [],
    pick,
    answers,
  });
}

const counts = (c: Partial<ReturnType<typeof one>["counts"]>) => ({
  taken: 0, kept: 0, agreed: 0, unchanged: 0, conflicts: 0, undecided: 0, answeredFile: 0, ignored: 0, ...c,
});

describe("planSync, the merge table", () => {
  it("f = b and a = b: unchanged, nothing written", () => {
    const p = one(2, 2, 2);
    expect(p.rows).toEqual([]);
    expect(p.counts).toEqual(counts({ unchanged: 1 }));
  });

  it("f = b and a ≠ b: the app's change is kept, nothing written", () => {
    const p = one(2, 3, 2);
    expect(p.rows).toEqual([]);
    expect(p.counts).toEqual(counts({ kept: 1 }));
    expect(p.kept).toEqual([{ ...id(1), key: key(1), name: "Card 1", base: 2, app: 3, file: 2 }]);
  });

  it("f = b with neither row (a hand-added holding the file never had): kept", () => {
    const p = one(0, 2, 0);
    expect(p.counts).toEqual(counts({ kept: 1 }));
    expect(p.rows).toEqual([]);
  });

  it("a = b, f ≠ b: the file's count is taken, with the file's printing attributes", () => {
    const p = one(2, 2, 4);
    expect(p.counts).toEqual(counts({ taken: 1 }));
    expect(p.rows).toEqual([{
      ...id(1), name: "Card 1",
      before: { quantity: 2, scryfallId: "app", condition: "LP" },
      after: { quantity: 4, scryfallId: "file", condition: "NM" },
    }]);
  });

  it("a = b, f ≠ b with f = 0: the file's removal is taken as no row", () => {
    const p = one(2, 2, 0);
    expect(p.counts).toEqual(counts({ taken: 1 }));
    expect(p.rows[0].after).toBeNull();
  });

  it("a = b = 0, f > 0: a new holding in the file is taken", () => {
    const p = one(0, 0, 3);
    expect(p.counts).toEqual(counts({ taken: 1 }));
    expect(p.rows[0]).toMatchObject({ before: null, after: { quantity: 3 } });
  });

  it("a ≠ b, f ≠ b, a = f: agreed, nothing written", () => {
    const p = one(1, 3, 3);
    expect(p.rows).toEqual([]);
    expect(p.counts).toEqual(counts({ agreed: 1 }));
  });

  it("a ≠ b, f ≠ b, a ≠ f: a conflict, undecided with no answer, and nothing written", () => {
    const p = one(1, 3, 2);
    expect(p.rows).toEqual([]);
    expect(p.counts).toEqual(counts({ conflicts: 1, undecided: 1 }));
    expect(p.conflicts).toEqual([{ ...id(1), key: key(1), name: "Card 1", base: 1, app: 3, file: 2 }]);
  });

  it("a conflict answered app keeps a: decided, nothing written", () => {
    const p = one(1, 3, 2, "everything", { byKey: { [key(1)]: "app" } });
    expect(p.rows).toEqual([]);
    expect(p.counts).toEqual(counts({ conflicts: 1 }));
    expect(p.conflicts[0].answer).toBe("app");
  });

  it("a conflict answered file takes f", () => {
    const p = one(1, 3, 2, "everything", { byKey: { [key(1)]: "file" } });
    expect(p.counts).toEqual(counts({ conflicts: 1, answeredFile: 1 }));
    expect(p.rows).toEqual([{
      ...id(1), name: "Card 1",
      before: { quantity: 3, scryfallId: "app", condition: "LP" },
      after: { quantity: 2, scryfallId: "file", condition: "NM" },
    }]);
  });

  it("a conflict answered file where the file removed it: written as no row", () => {
    const p = one(1, 3, 0, "everything", { all: "file" });
    expect(p.rows[0].after).toBeNull();
  });

  it("a holding that differs only in condition is not a conflict, and keeps a", () => {
    const p = planSync({
      base: new Map([[key(1), 2]]),
      app: new Map([[key(1), hold(1, 2, "LP")]]),
      file: [hold(1, 2, "NM")],
      pick: "everything",
    });
    expect(p.rows).toEqual([]);
    expect(p.counts).toEqual(counts({ unchanged: 1 }));
  });
});

describe("planSync, the partial picks", () => {
  it("Only what it adds: a removal or a lowering the file made is not taken", () => {
    expect(one(2, 2, 1, "additions").rows).toEqual([]);
    expect(one(2, 2, 1, "additions").counts).toEqual(counts({ ignored: 1 }));
    expect(one(2, 2, 0, "additions").rows).toEqual([]);
  });

  it("Only what it adds: a raise the file made is taken", () => {
    const p = one(2, 2, 5, "additions");
    expect(p.counts).toEqual(counts({ taken: 1 }));
    expect(p.rows[0].after?.quantity).toBe(5);
  });

  it("Only what it adds: a conflict is asked only when the file is higher, and a lower file count is ignored", () => {
    expect(one(1, 3, 5, "additions").counts).toEqual(counts({ conflicts: 1, undecided: 1 }));
    const lower = one(1, 3, 2, "additions", { all: "file" });
    expect(lower.counts).toEqual(counts({ ignored: 1 }));
    expect(lower.rows).toEqual([]);
    expect(lower.conflicts).toEqual([]);
  });

  it("Only its tokens: the card plan is empty, conflicts included", () => {
    for (const [b, a, f] of [[2, 2, 5], [2, 2, 0], [1, 3, 2]]) {
      const p = one(b, a, f, "tokens", { all: "file" });
      expect(p.rows).toEqual([]);
      expect(p.counts.conflicts).toBe(0);
    }
    // A kept change is still kept: the collection is left as it is.
    expect(one(2, 3, 2, "tokens").counts).toEqual(counts({ kept: 1 }));
  });
});

describe("planSync, bulk answers are rules", () => {
  // 600 conflicts: more than the 500 the review lists.
  const N = 600;
  const many = (answers?: SyncAnswers) => planSync({
    base: new Map(Array.from({ length: N }, (_, i) => [key(i), 1] as const)),
    app: new Map(Array.from({ length: N }, (_, i) => [key(i), hold(i, 3)] as const)),
    file: Array.from({ length: N }, (_, i) => hold(i, 2)),
    pick: "everything",
    answers,
  });

  it("a bulk File decides every conflict, those past the first 500 included", () => {
    const p = many({ all: "file" });
    expect(p.counts).toMatchObject({ conflicts: N, undecided: 0, answeredFile: N });
    expect(p.rows).toHaveLength(N);
    expect(p.rows.every((r) => r.after?.quantity === 2)).toBe(true);
  });

  it("a per-row answer overrides the bulk rule", () => {
    const p = many({ all: "file", byKey: { [key(550)]: "app" } });
    expect(p.counts).toMatchObject({ conflicts: N, undecided: 0, answeredFile: N - 1 });
    expect(p.rows.some((r) => r.oracleId === oracle(550))).toBe(false);
  });

  it("per-row answers alone leave the rest undecided", () => {
    const p = many({ byKey: { [key(5)]: "file" } });
    expect(p.counts).toMatchObject({ undecided: N - 1, answeredFile: 1 });
  });

  it("answerFor prefers the row's own answer", () => {
    expect(answerFor({ all: "app", byKey: { k: "file" } }, "k")).toBe("file");
    expect(answerFor({ all: "app" }, "k")).toBe("app");
    expect(answerFor(undefined, "k")).toBeUndefined();
  });
});

describe("Hugh's shape", () => {
  it("a Replace of F, three hand entries (2 new, 1 raised), then a Sync of F: 0 taken, 3 kept", () => {
    const F = [hold(1, 1), hold(2, 2), hold(3, 1)];
    const p = planSync({
      base: quantitiesOf(F),
      app: new Map([hold(1, 1), hold(2, 4), hold(3, 1), hold(4, 1), hold(5, 2)].map((h) => [collectionItemKey(h), h])),
      file: F,
      pick: "everything",
    });
    expect(p.rows).toEqual([]);
    expect(p.counts).toEqual(counts({ kept: 3, unchanged: 2 }));
  });
});

describe("quantitiesOf", () => {
  it("folds as the insert folds: lowercased set, a missing number and finish defaulted", () => {
    const q = quantitiesOf([
      { oracleId: oracle(1), setCode: "LEA", collectorNumber: "1", finish: "nonfoil", condition: null, quantity: 1 },
      { oracleId: oracle(1), setCode: "lea", collectorNumber: "1", finish: "nonfoil", condition: "NM", quantity: 2 },
      { oracleId: oracle(2), setCode: "lea", condition: null, quantity: 1 },
    ]);
    expect(q.get(key(1))).toBe(3);
    expect(q.get(`${oracle(2)}|lea||nonfoil`)).toBe(1);
  });
});

describe("staleness", () => {
  const m = (...e: [number, number][]) => new Map(e.map(([n, q]) => [key(n), q]));

  it("pins its threshold", () => expect(STALE_REVERSAL_SHARE).toBe(0.5));

  it("noNewer when the file's cards equal the anchor's (S1)", () => {
    expect(staleness(m([1, 2], [2, 1]), m([2, 1], [1, 2]), [])).toBe("noNewer");
  });

  it("older when the file is nearer to an earlier upload than to the anchor", () => {
    const earlier = m([1, 1], [2, 1], [3, 1]);
    const anchor = m([1, 2], [2, 2], [3, 2], [4, 1]);
    const file = m([1, 1], [2, 1], [3, 1], [5, 1]);
    expect(holdingDistance(file, earlier)).toBeLessThan(holdingDistance(file, anchor));
    expect(staleness(file, anchor, [m([9, 9]), earlier])).toBe("older");
  });

  it("older when most of its differences put back the anchor's own changes from its predecessor", () => {
    // The anchor raised 1 to 10 from the predecessor; the file puts 1, 2 and 3 back and keeps the rest,
    // so it is still nearer the anchor (3) than the predecessor (7): only the reversal rule says older.
    const predecessor = m(...Array.from({ length: 10 }, (_, i) => [i + 1, 1] as [number, number]));
    const anchor = m(...Array.from({ length: 10 }, (_, i) => [i + 1, 2] as [number, number]));
    const file = m([1, 1], [2, 1], [3, 1], ...Array.from({ length: 7 }, (_, i) => [i + 4, 2] as [number, number]));
    expect(holdingDistance(file, anchor)).toBe(3);
    expect(holdingDistance(file, predecessor)).toBe(7);
    expect(staleness(file, anchor, [predecessor])).toBe("older");
  });

  it("null for a newer file: changes of its own, not reversals", () => {
    const predecessor = m([1, 1], [2, 1]);
    const anchor = m([1, 2], [2, 1]);
    const file = m([1, 2], [2, 1], [3, 1], [4, 2]);
    expect(staleness(file, anchor, [predecessor])).toBeNull();
  });

  it("null with no earlier upload to compare", () => {
    expect(staleness(m([1, 1]), m([1, 2]), [])).toBeNull();
  });

  it("exactly half the differences reversing is not over the share; two of three is", () => {
    const predecessor = m([1, 1], [2, 1], [3, 1], [4, 1]);
    const anchor = m([1, 2], [2, 2], [3, 2], [4, 2]);
    // One reversal (1) and one change of its own (6): 1 of 2.
    const half = m([1, 1], [2, 2], [3, 2], [4, 2], [6, 1]);
    expect(holdingDistance(half, anchor)).toBe(2);
    expect(holdingDistance(half, predecessor)).toBe(4);
    expect(staleness(half, anchor, [predecessor])).toBeNull();
    // Two reversals (1, 2) and one change of its own (6): 2 of 3.
    const most = m([1, 1], [2, 1], [3, 2], [4, 2], [6, 1]);
    expect(holdingDistance(most, predecessor)).toBe(3);
    expect(staleness(most, anchor, [predecessor])).toBe("older");
  });
});

describe("parseSyncOptions", () => {
  it("defaults to Everything with no answers", () => {
    expect(parseSyncOptions(undefined)).toEqual({ pick: "everything", answers: {} });
  });

  it("keeps only app or file answers, and refuses a pick it does not know", () => {
    expect(parseSyncOptions({ pick: "tokens", answers: { all: "both", byKey: { a: "file", b: 3, c: "app" } } }))
      .toEqual({ pick: "tokens", answers: { byKey: { a: "file", c: "app" } } });
    expect(() => parseSyncOptions({ pick: "most" })).toThrow("unknown sync pick");
  });

  it("caps the review at 500, the handoff's number", () => expect(SYNC_REVIEW_CAP).toBe(500));
});

describe("nothingToSync", () => {
  it("is false with only an unanswered conflict and no token change: the review has to ask it", () => {
    const p = one(1, 3, 2);
    expect(p.rows).toEqual([]);
    expect(p.counts.undecided).toBe(1);
    expect(nothingToSync(p, 0)).toBe(false);
  });

  it("is true once that conflict is answered app, with no token change", () => {
    expect(nothingToSync(one(1, 3, 2, "everything", { all: "app" }), 0)).toBe(true);
  });

  it("is false with a row to write, or a token row to change", () => {
    expect(nothingToSync(one(2, 2, 4), 0)).toBe(false);
    expect(nothingToSync(one(2, 2, 2), 1)).toBe(false);
    expect(nothingToSync(one(2, 2, 2), 0)).toBe(true);
  });
});

describe("missingFromAnchor", () => {
  it("counts the anchor's holdings the file lacks or holds fewer of, and nothing the file adds or raises", () => {
    const anchor = new Map([[key(1), 2], [key(2), 1], [key(3), 4], [key(4), 1]]);
    const file = new Map([[key(1), 2], [key(3), 3], [key(4), 5], [key(5), 1]]);
    // card 2 is absent, card 3 is lower; card 4 is raised and card 5 is new, neither is missing.
    expect(missingFromAnchor(anchor, file)).toBe(2);
    expect(missingFromAnchor(anchor, anchor)).toBe(0);
  });
});

describe("changedTokenCount", () => {
  it("counts distinct tokens whose count moves either way, never a source-only change or a printing row", () => {
    expect(changedTokenCount([
      { kind: "token", id: "a", from: null, to: 2 },
      { kind: "token", id: "b", from: 3, to: 1 },
      { kind: "token", id: "c", from: 2, to: 2 },
      { kind: "printing", id: "p", from: null, to: 4 },
      { kind: "read", id: "", from: null, to: null },
      { kind: "token", id: "d", from: 1, to: null },
    ])).toBe(3);
  });

  it("counts a removal: an EMPTY token file under Replace's rule takes an upload-owned token away", () => {
    const state = { owned: [{ tokenOracleId: "t1", quantity: 2, source: "upload" }], uploadPrintings: [], read: true };
    const { changes } = planTokenWrite("replace", state, []);
    expect(changedTokenCount(changes)).toBe(1);
  });

  it("counts nothing for a hand mark the file reads at the same count", () => {
    // The file reads the hand-marked token at its count: the source moves, the count does not.
    const same = planTokenWrite("replace", { owned: [{ tokenOracleId: "t1", quantity: 2, source: "manual" }], uploadPrintings: [], read: true },
      [{ tokenOracleId: "t1", quantity: 2 }]);
    expect(changedTokenCount(same.changes)).toBe(0);
  });
});
