import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db", () => ({ db: {} }));
vi.mock("../../decks/versions", () => ({ commitVersion: vi.fn() }));
vi.mock("../../decks/prune-proxies", () => ({ pruneOrphanProxies: vi.fn() }));
vi.mock("../../recs/score", () => ({ isCommanderCandidate: (c: { candidate?: boolean }) => c.candidate !== false }));

const { upgradedDeck, prepareUpgradeIn } = await import("./apply");
const { boxFingerprint } = await import("./inputs");

const box = { commanderOracleId: "rootha", partnerOracleId: null, cards: [{ oracleId: "muddle", quantity: 1 }, { oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 1 }, { oracleId: "island", quantity: 9 }] };
const sorted = (cards: { oracleId: string; quantity: number }[]) => [...cards].sort((x, y) => x.oracleId.localeCompare(y.oracleId));

describe("upgradedDeck", () => {
  it("applies each pair: the cut goes, the add comes, the count holds", () => {
    const out = upgradedDeck(box, { lead: null, pairs: [{ cutId: "a", addId: "x" }, { cutId: "b", addId: "y" }] });
    expect(out.commanderOracleId).toBe("rootha");
    expect(sorted(out.cards)).toEqual(sorted([{ oracleId: "muddle", quantity: 1 }, { oracleId: "x", quantity: 1 }, { oracleId: "y", quantity: 1 }, { oracleId: "island", quantity: 9 }]));
    expect(out.cards.reduce((n, c) => n + c.quantity, 0)).toBe(box.cards.reduce((n, c) => n + c.quantity, 0));
  });
  it("leading with the alternate seats it and puts the box's commander among the 99, where a pair may cut it", () => {
    const led = upgradedDeck(box, { lead: "muddle", pairs: [] });
    expect(led.commanderOracleId).toBe("muddle");
    expect(led.cards.find((c) => c.oracleId === "rootha")?.quantity).toBe(1);
    expect(led.cards.some((c) => c.oracleId === "muddle")).toBe(false);
    const cut = upgradedDeck(box, { lead: "muddle", pairs: [{ cutId: "rootha", addId: "x" }] });
    expect(cut.cards.some((c) => c.oracleId === "rootha")).toBe(false);
    expect(cut.cards.reduce((n, c) => n + c.quantity, 0)).toBe(box.cards.reduce((n, c) => n + c.quantity, 0));
  });
  it("a partnered box keeps both commanders and never seats a lead", () => {
    const pair = { ...box, partnerOracleId: "yasmin" };
    const out = upgradedDeck(pair, { lead: null, pairs: [{ cutId: "a", addId: "x" }] });
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
    expect(await prepareUpgradeIn(fakeTx([run()], identities()), "u1", "box.json", "r1", box)).toEqual({ runId: "r1", lead: null, pairs: [{ cutId: "a", addId: "x" }] });
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
