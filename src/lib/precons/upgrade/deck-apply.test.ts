import { beforeEach, describe, expect, it, vi } from "vitest";

/** Every write and every lock revival, in the order they ran: Undo must revive before it reinserts. */
const log: { op: string; table?: unknown; values?: unknown }[] = [];
const holder: { tx: unknown } = { tx: null };
const locked = { now: new Set<string>() };

vi.mock("../../../db", () => ({ db: { transaction: (fn: (tx: unknown) => unknown) => fn(holder.tx) } }));
vi.mock("../../decks/versions", () => ({ commitVersion: vi.fn() }));
vi.mock("../../recs/score", () => ({ isCommanderCandidate: () => true }));
vi.mock("../../decks/prune-proxies", () => ({ pruneOrphanProxies: vi.fn(async () => { log.push({ op: "pruneProxies" }); }) }));
vi.mock("../../decks/locks", () => ({
  liveLockedIds: vi.fn(async () => locked.now),
  pruneOrphanLocks: vi.fn(async () => { log.push({ op: "pruneLocks" }); }),
  reviveDormantLocks: vi.fn(async (_tx: unknown, _deck: string, ids: string[]) => { log.push({ op: "revive", values: [...ids].sort() }); }),
}));
const prepared = { up: null as unknown };
vi.mock("./apply", async () => ({
  ...(await vi.importActual<typeof import("./apply")>("./apply")),
  prepareUpgradeIn: vi.fn(async () => prepared.up),
}));
const BOX = {
  commanderOracleId: "rootha", partnerOracleId: null,
  cards: [{ oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 1 }, { oracleId: "muddle", quantity: 1 }, { oracleId: "island", quantity: 9 }],
};
vi.mock("../start", () => ({ preparePreconDeckIn: vi.fn(async () => BOX) }));

const { applyUpgradeOnDeck, undoUpgradeOnDeck } = await import("./deck-apply");
const schema = await import("../../../db/schema");

/** A transaction whose selects answer from a queue, in call order, and whose writes land in `log`. */
function fakeTx(...answers: unknown[][]) {
  const queue = [...answers];
  const chain = () => {
    const b: Record<string, unknown> = {};
    for (const k of ["from", "where", "innerJoin", "orderBy", "limit", "for"]) b[k] = () => b;
    b.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(queue.shift() ?? []).then(res, rej);
    return b;
  };
  holder.tx = {
    select: () => chain(),
    insert: (table: unknown) => ({
      values: (values: unknown) => {
        log.push({ op: "insert", table, values });
        return Object.assign(Promise.resolve(), { onConflictDoNothing: async () => {}, onConflictDoUpdate: async () => {} });
      },
    }),
    update: (table: unknown) => ({ set: (values: unknown) => ({ where: async () => { log.push({ op: "update", table, values }); } }) }),
    delete: (table: unknown) => ({ where: async () => { log.push({ op: "delete", table }); } }),
  };
  return queue;
}

const created = new Date("2026-11-01T00:00:00Z");
const deckRow = (over: Record<string, unknown> = {}) => ({
  builtFromPrecon: "box.json", commanderOracleId: "rootha", partnerOracleId: null, createdAt: created, builtFromUpgradeId: null, ...over,
});
const liveBox = BOX.cards.map((c) => ({ ...c, auto: false }));
const v0 = { id: "v0", number: 0, committedAt: created, commanderOracleId: "rootha", partnerOracleId: null };
const pin = { oracleId: "a", setCode: "pca", collectorNumber: "12", createdAt: created, updatedAt: created };
const reservation = { userId: "u1", oracleId: "a", copies: 1, createdAt: new Date("2026-11-02T00:00:00Z") };
const RUN = "11111111-1111-4111-8111-111111111111";
const DECK = "22222222-2222-4222-8222-222222222222";

const writesTo = (table: unknown) => log.filter((w) => w.table === table);
const sorted = <T extends { oracleId: string }>(cards: T[]) => [...cards].sort((x, y) => x.oracleId.localeCompare(y.oracleId));

beforeEach(() => {
  log.length = 0;
  locked.now = new Set();
  prepared.up = { runId: RUN, lead: "muddle", pairs: [{ cutId: "a", addId: "x" }] };
});

/** Apply on a started deck at v0, a Muddle-led run cutting `a` for `x`; `a` is proxied, pinned and reserved. */
async function applyStarted() {
  fakeTx([deckRow()], liveBox, [v0], BOX.cards, [{ oracleId: "a" }], [pin], [reservation]);
  return applyUpgradeOnDeck("u1", DECK, RUN);
}

describe("applyUpgradeOnDeck (G17)", () => {
  it("swaps the list and seats the lead with the box's commander among the 99, and commits no version", async () => {
    expect(await applyStarted()).toEqual({ ok: true, swaps: 1, lead: "muddle" });
    const inserted = writesTo(schema.deckCards).find((w) => w.op === "insert")!.values as { oracleId: string; quantity: number }[];
    expect(sorted(inserted).map((c) => `${c.oracleId}:${c.quantity}`)).toEqual(["b:1", "island:9", "rootha:1", "x:1"]);
    const deck = writesTo(schema.decks).find((w) => w.op === "update")!.values as Record<string, unknown>;
    expect(deck).toMatchObject({ commanderOracleId: "muddle", partnerOracleId: null, builtFromUpgradeId: RUN });
    expect(writesTo(schema.deckVersions)).toEqual([]);
  });

  it("refuses when a cut is a card the player locked, and writes nothing", async () => {
    locked.now = new Set(["a"]);
    fakeTx([deckRow()], liveBox, [v0], BOX.cards);
    expect(await applyUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false, reason: "locked" });
    expect(log.filter((w) => w.op !== "revive")).toEqual([]);
  });

  it("refuses over the player's own changes, after a commit past v0, and on a deck with no precon", async () => {
    fakeTx([deckRow()], [...liveBox.slice(1), { oracleId: "z", quantity: 1, auto: false }], [v0], BOX.cards);
    expect(await applyUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false, reason: "closed" });
    fakeTx([deckRow()], liveBox, [v0, { ...v0, id: "v1", number: 1 }], BOX.cards);
    expect(await applyUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false, reason: "closed" });
    fakeTx([deckRow({ builtFromPrecon: null })]);
    expect(await applyUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false, reason: "closed" });
    expect(log).toEqual([]);
  });

  it("refuses, rather than throwing, when the box no longer passes the start's checks, and rethrows anything else", async () => {
    const { preparePreconDeckIn } = await import("../start");
    vi.mocked(preparePreconDeckIn).mockRejectedValueOnce(new Error("card is not a legal commander"));
    fakeTx([deckRow()]);
    expect(await applyUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false, reason: "closed" });
    vi.mocked(preparePreconDeckIn).mockRejectedValueOnce(new Error("connection reset"));
    fakeTx([deckRow()]);
    await expect(applyUpgradeOnDeck("u1", DECK, RUN)).rejects.toThrow("connection reset");
  });

  it("refuses a run that changes nothing, so a second Apply can never bury the first one's snapshot", async () => {
    prepared.up = { runId: RUN, lead: null, pairs: [] };
    fakeTx([deckRow()], liveBox, [v0], BOX.cards);
    expect(await applyUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false, reason: "listChanged" });
    expect(log).toEqual([]);
  });

  it("passes on the run's own refusal", async () => {
    prepared.up = "listChanged";
    fakeTx([deckRow()], liveBox, [v0], BOX.cards);
    expect(await applyUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false, reason: "listChanged" });
    expect(log).toEqual([]);
  });

  it("applies to a linked brew with no version, which stays a brew", async () => {
    prepared.up = { runId: RUN, lead: null, pairs: [{ cutId: "a", addId: "x" }] };
    fakeTx([deckRow()], liveBox, [], [], [], []);
    expect((await applyUpgradeOnDeck("u1", DECK, RUN)).ok).toBe(true);
    const deck = writesTo(schema.decks).find((w) => w.op === "update")!.values as { preconUpgradeUndo: { versionId: string | null } };
    expect(deck.preconUpgradeUndo.versionId).toBeNull();
    expect(writesTo(schema.deckVersions)).toEqual([]);
  });
});

describe("Apply then Undo puts back everything Apply took", () => {
  it("the list, the helm, the cut card's proxy mark, printing pick and reservation, and the lead's lock", async () => {
    locked.now = new Set(["muddle"]); // the lead leaves the 99 for the commander's seat: its lock goes dormant, not lost
    await applyStarted();
    const snap = (writesTo(schema.decks).find((w) => w.op === "update")!.values as { preconUpgradeUndo: import("../../../db/schema").PreconUpgradeUndo }).preconUpgradeUndo;
    expect(snap.proxies).toEqual(["a"]);
    expect(snap.printings).toEqual([{ ...pin, createdAt: created.toISOString(), updatedAt: created.toISOString() }]);
    expect(snap.assignments).toEqual([{ ...reservation, createdAt: reservation.createdAt.toISOString() }]);

    log.length = 0;
    locked.now = new Set();
    const json = JSON.parse(JSON.stringify(snap)); // as the jsonb column hands it back
    fakeTx([{ commanderOracleId: "muddle", partnerOracleId: null, builtFromUpgradeId: RUN, undo: json }], [{ id: "v0" }], snap.after.cards);
    expect(await undoUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: true });

    const ops = log.map((w) => w.op);
    expect(log.find((w) => w.op === "revive")!.values).toEqual(["a", "muddle"]);
    expect(ops.indexOf("revive")).toBeLessThan(log.findIndex((w) => w.op === "insert" && w.table === schema.deckCards));
    expect(writesTo(schema.deckCards).find((w) => w.op === "insert")!.values).toEqual(liveBox.map((c) => ({ deckId: DECK, ...c })));
    expect(writesTo(schema.decks).find((w) => w.op === "update")!.values).toEqual({
      commanderOracleId: "rootha", partnerOracleId: null, builtFromUpgradeId: null, preconUpgradeUndo: null,
    });
    expect(writesTo(schema.deckProxies)[0].values).toEqual([{ deckId: DECK, oracleId: "a" }]);
    expect(writesTo(schema.deckPrintings)[0].values).toEqual([{ deckId: DECK, ...pin }]);
    expect(writesTo(schema.cardAssignments)[0].values).toEqual([{ ...reservation, deckId: DECK }]);
    // The statements come back after the prune, or the prune would reconcile them away again.
    expect(ops.lastIndexOf("pruneProxies")).toBeLessThan(log.findIndex((w) => w.table === schema.deckProxies));
  });

  it("refuses when the deck moved since Apply: a commit, an edit, a lock on an add, or another run", async () => {
    await applyStarted();
    const snap = JSON.parse(JSON.stringify((writesTo(schema.decks).find((w) => w.op === "update")!.values as { preconUpgradeUndo: unknown }).preconUpgradeUndo));
    const deck = { commanderOracleId: "muddle", partnerOracleId: null, builtFromUpgradeId: RUN, undo: snap };
    log.length = 0;
    fakeTx([deck], [{ id: "v1" }], snap.after.cards);
    expect(await undoUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false });
    fakeTx([deck], [{ id: "v0" }], snap.after.cards.slice(1));
    expect(await undoUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false });
    locked.now = new Set(["x"]);
    fakeTx([deck], [{ id: "v0" }], snap.after.cards);
    expect(await undoUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false });
    locked.now = new Set();
    // Another run's Undo, with everything else as Apply left it.
    fakeTx([deck], [{ id: "v0" }], snap.after.cards, []);
    expect(await undoUpgradeOnDeck("u1", DECK, "33333333-3333-4333-8333-333333333333")).toEqual({ ok: false });
    // The cut card's copy was reserved for another deck after Apply freed it.
    fakeTx([deck], [{ id: "v0" }], snap.after.cards, [{ deckId: "other-deck" }]);
    expect(await undoUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: false });
    expect(log).toEqual([]);
  });

  it("still undoes once the run row is gone and the deck's link to it was set null", async () => {
    await applyStarted();
    const snap = JSON.parse(JSON.stringify((writesTo(schema.decks).find((w) => w.op === "update")!.values as { preconUpgradeUndo: unknown }).preconUpgradeUndo));
    log.length = 0;
    fakeTx([{ commanderOracleId: "muddle", partnerOracleId: null, builtFromUpgradeId: null, undo: snap }], [{ id: "v0" }], snap.after.cards, []);
    expect(await undoUpgradeOnDeck("u1", DECK, RUN)).toEqual({ ok: true });
  });
});
