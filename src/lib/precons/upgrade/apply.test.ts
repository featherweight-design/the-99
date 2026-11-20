import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db", () => ({ db: {} }));
vi.mock("../../decks/versions", () => ({ commitVersion: vi.fn() }));
vi.mock("../../decks/prune-proxies", () => ({ pruneOrphanProxies: vi.fn() }));
vi.mock("../../decks/locks", () => ({ pruneOrphanLocks: vi.fn() }));
vi.mock("../../recs/score", () => ({ isCommanderCandidate: (c: { candidate?: boolean }) => c.candidate !== false }));

const { upgradedDeck, prepareUpgradeIn, picksShape, picksOfRun } = await import("./apply");
const { MAX_SWAPS } = await import("./constants");
const { boxFingerprint } = await import("./inputs");

const box = { commanderOracleId: "rootha", partnerOracleId: null, cards: [{ oracleId: "muddle", quantity: 1 }, { oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 1 }, { oracleId: "island", quantity: 9 }] };
const sorted = (cards: { oracleId: string; quantity: number }[]) => [...cards].sort((x, y) => x.oracleId.localeCompare(y.oracleId));

describe("upgradedDeck", () => {
  it("applies each pick: the cuts go, the adds come, the count holds", () => {
    const out = upgradedDeck(box, { lead: null, cuts: ["a", "b"], adds: ["x", "y"] });
    expect(out.commanderOracleId).toBe("rootha");
    expect(sorted(out.cards)).toEqual(sorted([{ oracleId: "muddle", quantity: 1 }, { oracleId: "x", quantity: 1 }, { oracleId: "y", quantity: 1 }, { oracleId: "island", quantity: 9 }]));
    expect(out.cards.reduce((n, c) => n + c.quantity, 0)).toBe(box.cards.reduce((n, c) => n + c.quantity, 0));
  });
  it("leading with the alternate seats it and puts the box's commander among the 99, where a pair may cut it", () => {
    const led = upgradedDeck(box, { lead: "muddle", adds: [], cuts: [] });
    expect(led.commanderOracleId).toBe("muddle");
    expect(led.cards.find((c) => c.oracleId === "rootha")?.quantity).toBe(1);
    expect(led.cards.some((c) => c.oracleId === "muddle")).toBe(false);
    const cut = upgradedDeck(box, { lead: "muddle", cuts: ["rootha"], adds: ["x"] });
    expect(cut.cards.some((c) => c.oracleId === "rootha")).toBe(false);
    expect(cut.cards.reduce((n, c) => n + c.quantity, 0)).toBe(box.cards.reduce((n, c) => n + c.quantity, 0));
  });
  it("a subset cuts and adds only what was picked, whichever pair each came from", () => {
    // Keep a's pair's add (x) but not its cut; cut b for x: the cards are picked separately (README call 9).
    const out = upgradedDeck(box, { lead: null, cuts: ["b"], adds: ["x"] });
    expect(sorted(out.cards)).toEqual(sorted([{ oracleId: "muddle", quantity: 1 }, { oracleId: "a", quantity: 1 }, { oracleId: "x", quantity: 1 }, { oracleId: "island", quantity: 9 }]));
  });
  it("a partnered box keeps both commanders and never seats a lead", () => {
    const pair = { ...box, partnerOracleId: "yasmin" };
    const out = upgradedDeck(pair, { lead: null, cuts: ["a"], adds: ["x"] });
    expect([out.commanderOracleId, out.partnerOracleId]).toEqual(["rootha", "yasmin"]);
  });
});

/** A transaction whose selects answer from a queue, in call order: the run row, then (for a lead) the card row. */
const fakeTx = (...answers: unknown[][]) => {
  const queue = [...answers];
  return { select: () => ({ from: () => ({ where: async () => queue.shift() ?? [] }) }) } as never;
};
/** The identity read: every card the swapped deck holds, with the colors it carries. */
const identities = (over: Record<string, string[]> = {}) =>
  ["rootha", "muddle", "a", "b", "island", "x"].map((id) => ({ id, identity: over[id] ?? ["U", "R"] }));
const fp = boxFingerprint(box.cards.map((c) => ({ ...c, isCommander: false })));
const run = (over: Record<string, unknown> = {}) => ({ strategyKey: "rootha/3/spells", listFp: fp, pairs: [{ cutId: "a", addId: "x", cut: "A", add: "X" }], ...over });

describe("prepareUpgradeIn", () => {
  it("answers gone for a run that is not the reader's own, done and for this box", async () => {
    expect(await prepareUpgradeIn(fakeTx([]), "u1", "box.json", "r1", box)).toBe("gone");
  });
  it("refuses a run made over another list, and a run with no recorded list", async () => {
    expect(await prepareUpgradeIn(fakeTx([run({ listFp: "other" })]), "u1", "box.json", "r1", box)).toBe("listChanged");
    expect(await prepareUpgradeIn(fakeTx([run({ listFp: null })]), "u1", "box.json", "r1", box)).toBe("listChanged");
  });
  it("accepts the box's own commander with its swaps", async () => {
    expect(await prepareUpgradeIn(fakeTx([run()], identities()), "u1", "box.json", "r1", box)).toEqual({ runId: "r1", lead: null, adds: ["x"], cuts: ["a"] });
  });
  it("refuses a swapped deck with a card outside the lead's colors", async () => {
    expect(await prepareUpgradeIn(fakeTx([run()], identities({ x: ["G"] })), "u1", "box.json", "r1", box)).toBe("listChanged");
  });
  it("refuses a cut that is gone and an add the deck already holds", async () => {
    expect(await prepareUpgradeIn(fakeTx([run({ pairs: [{ cutId: "zz", addId: "x" }] })], identities()), "u1", "box.json", "r1", box)).toBe("listChanged");
    expect(await prepareUpgradeIn(fakeTx([run({ pairs: [{ cutId: "a", addId: "b" }] })], identities()), "u1", "box.json", "r1", box)).toBe("listChanged");
  });
  it("seats the alternate only when it is in the box and legal to lead", async () => {
    const lead = run({ strategyKey: "muddle/3/spells" });
    expect((await prepareUpgradeIn(fakeTx([lead], [{ commanderLegal: true }], identities()), "u1", "box.json", "r1", box) as { lead: string }).lead).toBe("muddle");
    expect(await prepareUpgradeIn(fakeTx([lead], [{ commanderLegal: false }]), "u1", "box.json", "r1", box)).toBe("listChanged");
    expect(await prepareUpgradeIn(fakeTx([lead], [{ commanderLegal: true, candidate: false }]), "u1", "box.json", "r1", box)).toBe("listChanged");
    expect(await prepareUpgradeIn(fakeTx([run({ strategyKey: "stranger/3/spells" })]), "u1", "box.json", "r1", box)).toBe("listChanged");
  });
  it("never seats a lead on a partnered box", async () => {
    const pair = { ...box, partnerOracleId: "yasmin" };
    const pairFp = boxFingerprint(pair.cards.map((c) => ({ ...c, isCommander: false })));
    expect(await prepareUpgradeIn(fakeTx([run({ listFp: pairFp, strategyKey: "muddle/3/spells" })], [{ commanderLegal: true }]), "u1", "box.json", "r1", pair)).toBe("listChanged");
  });
});

const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const [CA, CB, CC, AX, AY, AZ] = [1, 2, 3, 4, 5, 6].map(U);
const uBox = { commanderOracleId: "rootha", partnerOracleId: null, cards: [CA, CB, CC].map((oracleId) => ({ oracleId, quantity: 1 })).concat([{ oracleId: "island", quantity: 9 }]) };
const uFp = boxFingerprint(uBox.cards.map((c) => ({ ...c, isCommander: false })));
const uPairs = [{ cutId: CA, addId: AX }, { cutId: CB, addId: AY }, { cutId: CC, addId: AZ }];
const uRun = { strategyKey: "rootha/3/spells", listFp: uFp, pairs: uPairs };
const uIdentities = () => ["rootha", CA, CB, CC, AX, AY, AZ, "island"].map((id) => ({ id, identity: ["U"] }));

describe("picksShape", () => {
  it("takes two arrays of oracle ids, none repeated, at most MAX_SWAPS a side", () => {
    expect(picksShape({ adds: [AX], cuts: [CA] })).toEqual({ adds: [AX], cuts: [CA] });
    expect(picksShape({ adds: [], cuts: [] })).toEqual({ adds: [], cuts: [] });
  });
  it("refuses anything else", () => {
    expect(picksShape(null)).toBeNull();
    expect(picksShape("x")).toBeNull();
    expect(picksShape({ adds: [AX] })).toBeNull();
    expect(picksShape({ adds: AX, cuts: [CA] })).toBeNull();
    expect(picksShape({ adds: ["not-a-uuid"], cuts: [CA] })).toBeNull();
    expect(picksShape({ adds: [[AX]], cuts: [CA] })).toBeNull();
    expect(picksShape({ adds: [AX, AX], cuts: [CA, CB] })).toBeNull();
    const over = Array.from({ length: MAX_SWAPS + 1 }, (_, i) => U(100 + i));
    expect(picksShape({ adds: over, cuts: over.map((_, i) => U(200 + i)) })).toBeNull();
  });
});

describe("picksOfRun", () => {
  it("absent picks are the whole run", () => {
    expect(picksOfRun(uPairs, undefined)).toEqual({ adds: [AX, AY, AZ], cuts: [CA, CB, CC] });
  });
  it("refuses a whole run whose stored pairs repeat a cut or an add, which would end the deck at 100", () => {
    expect(picksOfRun([{ cutId: CA, addId: AX }, { cutId: CA, addId: AY }], undefined)).toBeNull();
    expect(picksOfRun([{ cutId: CA, addId: AX }, { cutId: CB, addId: AX }], undefined)).toBeNull();
  });
  it("keeps a subset of either side, picked apart from its pair", () => {
    expect(picksOfRun(uPairs, { adds: [AX, AZ], cuts: [CB, CC] })).toEqual({ adds: [AX, AZ], cuts: [CB, CC] });
  });
  it("refuses uneven, empty, duplicate, outside-the-run and wrong-side picks", () => {
    expect(picksOfRun(uPairs, { adds: [AX, AY], cuts: [CA] })).toBeNull();
    expect(picksOfRun(uPairs, { adds: [], cuts: [] })).toBeNull();
    expect(picksOfRun(uPairs, { adds: [AX, AX], cuts: [CA, CB] })).toBeNull();
    expect(picksOfRun(uPairs, { adds: [U(99)], cuts: [CA] })).toBeNull();
    expect(picksOfRun(uPairs, { adds: [CA], cuts: [AX] })).toBeNull();
  });
});

describe("prepareUpgradeIn with picks", () => {
  it("refuses a stored run that repeats a cut as listChanged when no picks were sent", async () => {
    const corrupt = { ...uRun, pairs: [{ cutId: CA, addId: AX }, { cutId: CA, addId: AY }] };
    expect(await prepareUpgradeIn(fakeTx([corrupt], uIdentities()), "u1", "box.json", "r1", uBox)).toBe("listChanged");
  });
  it("prepares exactly the picked adds and cuts", async () => {
    const up = await prepareUpgradeIn(fakeTx([uRun], uIdentities()), "u1", "box.json", "r1", uBox, { adds: [AY], cuts: [CA] });
    expect(up).toEqual({ runId: "r1", lead: null, adds: [AY], cuts: [CA] });
    // A start from it builds exactly those swaps: CA out, AY in, CB and CC kept.
    const made = upgradedDeck(uBox, up as { lead: null; adds: string[]; cuts: string[] });
    expect(made.cards.map((c) => c.oracleId).sort()).toEqual([AY, CB, CC, "island"].sort());
  });
  it("answers picks for any pick the run does not allow, before reading anything else", async () => {
    for (const picks of [
      { adds: [AX, AY], cuts: [CA] },
      { adds: [], cuts: [] },
      { adds: [AX, AX], cuts: [CA, CB] },
      { adds: [U(99)], cuts: [CA] },
      { adds: Array.from({ length: MAX_SWAPS + 1 }, (_, i) => U(100 + i)), cuts: Array.from({ length: MAX_SWAPS + 1 }, (_, i) => U(200 + i)) },
    ]) {
      expect(await prepareUpgradeIn(fakeTx([uRun]), "u1", "box.json", "r1", uBox, picks)).toBe("picks");
    }
  });
  it("answers picks, not listChanged, for a subset that leaves a card the lead can't hold", async () => {
    // CB is off-color for the lead; the run cuts it, the picked subset keeps it.
    const ids = () => uIdentities().map((r) => (r.id === CB ? { ...r, identity: ["G"] } : r));
    expect(await prepareUpgradeIn(fakeTx([uRun], ids()), "u1", "box.json", "r1", uBox, { adds: [AX], cuts: [CA] })).toBe("picks");
    // The whole run cuts it, so it passes; the same failure with no picks sent stays listChanged.
    expect(await prepareUpgradeIn(fakeTx([uRun], ids().filter((r) => r.id !== CB)), "u1", "box.json", "r1", uBox)).toEqual({ runId: "r1", lead: null, adds: [AX, AY, AZ], cuts: [CA, CB, CC] });
    expect(await prepareUpgradeIn(fakeTx([uRun], ids()), "u1", "box.json", "r1", uBox)).toBe("listChanged");
  });
  it("still answers gone first for a run that is not the reader's", async () => {
    expect(await prepareUpgradeIn(fakeTx([]), "u1", "box.json", "r1", uBox, { adds: [AX], cuts: [CA] })).toBe("gone");
  });
});
