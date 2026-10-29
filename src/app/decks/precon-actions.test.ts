import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: vi.fn(async () => ENV_VIEW) };
});

const state = vi.hoisted(() => ({
  selects: [] as unknown[][], wheres: [] as unknown[], orders: [] as unknown[], written: [] as unknown[], revalidated: [] as string[],
  collectionEdit: true, addResult: null as unknown, addCalls: [] as unknown[][], after: [] as (() => Promise<void>)[],
  invalidated: [] as string[], warmed: [] as string[], committed: [] as unknown[], carried: [] as string[],
  picking: false, picks: [] as unknown[][], pickResult: ((): unknown => ({ ok: true, entryId: "e" })) as (f: string) => unknown,
}));

vi.mock("../../db", () => {
  const chain = () => {
    const rows = state.selects.shift() ?? [];
    const q: Record<string, unknown> = {};
    for (const k of ["from", "innerJoin", "leftJoin"]) q[k] = () => q;
    q.orderBy = (o: unknown) => { state.orders.push(o); return q; };
    q.where = (w: unknown) => { state.wheres.push(w); return q; };
    q.then = (res: (v: unknown) => unknown) => Promise.resolve(rows).then(res);
    return q;
  };
  // A transaction reads as the pool does: the start reads its precon inside one snapshot.
  const reads = { select: () => chain() };
  return { db: { ...reads, transaction: (fn: (tx: unknown) => unknown) => fn(reads) } };
});
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
// The dialog's owned start and the pick share one lib call; a pick's call answers from `pickResult`, keyed by file.
vi.mock("../../lib/precons/start-owned", () => ({
  startPreconOwned: async (...args: unknown[]) => {
    if (state.picking) { state.picks.push(args); return state.pickResult(args[1] as string); }
    state.addCalls.push(args); return state.addResult;
  },
}));
vi.mock("../../lib/collection/edit-flag", () => ({
  collectionEditEnabled: () => state.collectionEdit,
}));
const committed = vi.hoisted(() => ({ map: new Map<string, string>(), decks: new Map<string, string>(), asked: [] as string[][] }));
vi.mock("../../lib/precons/added", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/precons/added")>()),
  committedPreconAdds: async (_user: string, ids: string[]) => { committed.asked.push(ids); return committed.map; },
  preconAddDecks: async () => committed.decks,
}));
vi.mock("../../lib/collection/invalidate", () => ({ invalidateCollectionReaders: (id: string) => state.invalidated.push(id) }));
vi.mock("../../lib/recs/warm", () => ({ warmCommanderScores: async (id: string) => { state.warmed.push(id); } }));
// Which starts carry over in their own `after()`: only Precons I own, the one with no arrival (small items 5).
vi.mock("../../lib/precons/carry-over", () => ({ carryOverAfterStart: async (deckId: string) => { state.carried.push(deckId); } }));
vi.mock("next/server", () => ({ after: (fn: () => Promise<void>) => { state.after.push(fn); } }));
vi.mock("../../lib/decks/revalidate-claims", () => ({ revalidateClaims: (id: string) => state.revalidated.push(id) }));
vi.mock("../../lib/decks/versions", () => ({
  commitVersion: async (deckId: string, note: unknown, tx: unknown, _snapshot: unknown, _env: unknown, opts?: { first: number }) => {
    state.committed.push({ deckId, note, inTx: tx !== undefined, first: opts?.first ?? 1 });
    return { version: {}, cardCount: 0 };
  },
}));
vi.mock("../../lib/decks/write-imported-deck", () => ({
  writeImportedDeck: async (_tx: unknown, d: unknown) => { state.written.push(d); return "deck-1"; },
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { preconCards } from "../../db/schema";
import { addPrecons, createDeckFromPrecon, startPreconOwned } from "./precon-actions";

const lead = (oracleId: string, name: string, over: Record<string, unknown> = {}) => ({
  oracleId, name, typeLine: "Legendary Creature — Eldrazi", oracleText: "", manaCost: "{5}", layout: "normal", commanderLegal: true, ...over,
});

beforeEach(() => {
  state.selects = []; state.wheres = []; state.orders = []; state.written = []; state.revalidated = []; state.committed = [];
  state.picking = false; state.picks = []; state.pickResult = (f) => ({ ok: true, entryId: `entry-${f}`, deckId: `deck-${f}` });
  committed.map = new Map(); committed.decks = new Map(); committed.asked = [];
  state.collectionEdit = true; state.addResult = null; state.addCalls = []; state.after = []; state.invalidated = []; state.warmed = [];
  state.carried = [];
});
const params = (w: unknown) => new PgDialect().sqlToQuery(w as SQL).params;

describe("createDeckFromPrecon", () => {
  it("writes the precon's exact list with counts, pins each card to the box's printing, commits it, and lands on the deck", async () => {
    state.selects = [
      [{ fileName: "EldraziUnbound_CMM", twinOf: null }],
      [
        { oracleId: "zhulodok", quantity: 1, isCommander: true, setCode: "CMM", collectorNumber: "2" },
        { oracleId: "sol-ring", quantity: 1, isCommander: false, setCode: "cmm", collectorNumber: "400" },
        { oracleId: "wastes", quantity: 10, isCommander: false, setCode: "cmm", collectorNumber: "450" },
        { oracleId: "wastes", quantity: 5, isCommander: false, setCode: "cmm", collectorNumber: "451" },
        { oracleId: "dockside", quantity: 1, isCommander: false, setCode: null, collectorNumber: null },
      ],
      [lead("zhulodok", "Zhulodok, Void Gorger")],
    ];
    await expect(createDeckFromPrecon("EldraziUnbound_CMM", "  My Eldrazi ")).rejects.toThrow("REDIRECT:/decks/deck-1?from=precon");
    expect(state.written).toEqual([{
      userId: "user_1", name: "My Eldrazi", commanderOracleId: "zhulodok", partnerOracleId: null,
      cards: [{ oracleId: "sol-ring", quantity: 1 }, { oracleId: "wastes", quantity: 15 }, { oracleId: "dockside", quantity: 1 }],
      // The commander too; a basic at its first art; a card the catalog has no printing for, none.
      printings: [
        { oracleId: "zhulodok", setCode: "cmm", collectorNumber: "2" },
        { oracleId: "sol-ring", setCode: "cmm", collectorNumber: "400" },
        { oracleId: "wastes", setCode: "cmm", collectorNumber: "450" },
      ],
      builtFromPrecon: "EldraziUnbound_CMM",
    }]);
    // Committed as v0, the precon's own, inside the deck's own transaction: no draft is left to commit.
    expect(state.committed).toEqual([{ deckId: "deck-1", note: null, inTx: true, first: 0 }]);
    expect(state.revalidated).toEqual(["deck-1"]);
    // The feed's order, so a pair's lead is the commander its page names first.
    expect(state.orders).toEqual([preconCards.position]);
    // The carry-over is the landing's, inline (`carryOnArrival`): nothing is scheduled after this response.
    for (const fn of state.after) await fn();
    expect(state.after).toEqual([]);
    expect(state.carried).toEqual([]);
  });

  it("starts a twin in its own printings, recorded as built from its plain edition", async () => {
    state.selects = [[{ fileName: "X_CE", twinOf: "X" }], [{ oracleId: "c", quantity: 1, isCommander: true, setCode: "xce", collectorNumber: "900" }], [lead("c", "C")]];
    await expect(createDeckFromPrecon("X_CE", "X")).rejects.toThrow(/REDIRECT/);
    const written = state.written[0] as { builtFromPrecon: string; printings: unknown[] };
    expect(written.builtFromPrecon).toBe("X");
    expect(written.printings).toEqual([{ oracleId: "c", setCode: "xce", collectorNumber: "900" }]);
    // The twin's OWN rows: the ingest keeps every edition's list, at that edition's printings.
    expect(params(state.wheres[1])).toEqual(["X_CE"]);
  });

  it("refuses a pair the app's own rule does not form, and an illegal commander", async () => {
    state.selects = [[{ fileName: "P", twinOf: null }],
      [{ oracleId: "a", quantity: 1, isCommander: true }, { oracleId: "b", quantity: 1, isCommander: true }],
      [lead("a", "A"), lead("b", "B")]];
    await expect(createDeckFromPrecon("P", "P")).rejects.toThrow("commanders cannot be paired");
    state.selects = [[{ fileName: "Q", twinOf: null }], [{ oracleId: "a", quantity: 1, isCommander: true }], [lead("a", "A", { commanderLegal: false })]];
    await expect(createDeckFromPrecon("Q", "Q")).rejects.toThrow("card is not a legal commander");
    expect(state.written).toEqual([]);
  });

  it("refuses an empty name and an unknown precon before writing", async () => {
    await expect(createDeckFromPrecon("X", "   ")).rejects.toThrow();
    state.selects = [[]];
    await expect(createDeckFromPrecon("Nope", "Name")).rejects.toThrow("precon not found");
    expect(state.written).toEqual([]);
  });
});

describe("startPreconOwned", () => {
  const ACTION = "00000000-0000-4000-8000-000000000001";
  const ENTRY = "7d0a1c1e-4d1a-4b9a-8d3c-2f7a5a9e1b11";
  const STARTED = { ok: true, deckId: "deck-9", entryId: ENTRY };
  const flush = async () => { for (const fn of state.after) await fn(); };

  it("refuses while collection editing is off, as every collection write does, writing nothing", async () => {
    state.collectionEdit = false;
    await expect(startPreconOwned("MultiverseReforged_FRC", "M", ACTION)).rejects.toThrow("collection editing is off");
    expect(state.addCalls).toEqual([]);
  });

  it("refuses a malformed action id or name, and answers notFound for a malformed file name, writing nothing", async () => {
    await expect(startPreconOwned("MultiverseReforged_FRC", "M", "not-a-uuid")).rejects.toThrow("bad action id");
    await expect(startPreconOwned("MultiverseReforged_FRC", "   ", ACTION)).rejects.toThrow();
    expect(await startPreconOwned("", "M", ACTION)).toEqual({ ok: false, reason: "notFound" });
    expect(await startPreconOwned("x".repeat(201), "M", ACTION)).toEqual({ ok: false, reason: "notFound" });
    expect(state.addCalls).toEqual([]);
  });

  it("starts for the signed-in player under the action id, and lands on the deck carrying the add's entry", async () => {
    state.addResult = STARTED;
    await expect(startPreconOwned("MultiverseReforged_FRC", "  Mine ", ACTION)).rejects.toThrow(`REDIRECT:/decks/deck-9?from=precon&added=${ENTRY}`);
    expect(state.addCalls.map(([user, file, name, id, , placements]) => [user, file, name, id, placements])).toEqual([
      ["user_1", "MultiverseReforged_FRC", "Mine", ACTION, true],
    ]);
    expect(state.revalidated).toEqual(["deck-9"]);
  });

  it("invalidates the collection's readers and warms the scores after a start", async () => {
    state.addResult = STARTED;
    await expect(startPreconOwned("MultiverseReforged_FRC", "M", ACTION)).rejects.toThrow(/REDIRECT/);
    expect(state.invalidated).toEqual([]);
    await flush();
    expect(state.invalidated).toEqual(["user_1"]);
    expect(state.warmed).toEqual(["user_1"]);
    // The carry-over is the landing's, inline (`carryOnArrival`), never this action's `after()`.
    expect(state.carried).toEqual([]);
  });

  it("returns a refusal for the dialog to say, touching no reader", async () => {
    state.addResult = { ok: false, reason: "failed" };
    expect(await startPreconOwned("MultiverseReforged_FRC", "M", ACTION)).toEqual({ ok: false, reason: "failed" });
    expect(state.after).toEqual([]);
    expect(state.revalidated).toEqual([]);
  });
});

describe("addPrecons (no-collection entry S4 to S7)", () => {
  const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  const CATALOG = [
    { fileName: "Abzan", twinOf: null, name: "Abzan Armor" }, { fileName: "Revival", twinOf: null, name: "Revival Trance" },
    { fileName: "Revival_CE", twinOf: "Revival", name: "Revival Trance (Collector's Edition)" },
    { fileName: "Sultai", twinOf: null, name: "Sultai Arisen" }, { fileName: "Temur", twinOf: null, name: "Temur Roar" },
  ];
  beforeEach(() => { state.picking = true; });

  it("adds each box for the signed-in reader with its own id, the twin at its chosen edition, and retires the readers", async () => {
    state.selects = [CATALOG];
    const out = await addPrecons([
      { fileName: "Abzan", edition: "regular", file: "Abzan", actionId: ID(1) }, { fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: ID(2) },
    ]);
    expect(state.picks.map((a) => [a[0], a[1], a[3]])).toEqual([["user_1", "Abzan", ID(1)], ["user_1", "Revival_CE", ID(2)]]);
    expect(out).toEqual([
      { rowFile: "Abzan", ok: true, entryId: "entry-Abzan", deckId: "deck-Abzan" },
      { rowFile: "Revival", ok: true, entryId: "entry-Revival_CE", deckId: "deck-Revival_CE" },
    ]);
    // Each box starts its deck under the precon's own name; a Collector's Edition under the plain one, as the dialog names it.
    expect(state.picks.map((a) => a[2])).toEqual(["Abzan Armor", "Revival Trance"]);
    expect(state.picks.map((a) => a[5])).toEqual([true, true]);
    expect(state.invalidated).toEqual(["user_1"]);
    expect(state.revalidated).toEqual(["deck-Abzan", "deck-Revival_CE"]);
    await Promise.all(state.after.map((f) => f()));
    expect(state.warmed).toEqual(["user_1"]);
    // No arrival follows this start, so it keeps the carry-over in its `after()`, one per deck it started.
    expect(state.carried).toEqual(["deck-Abzan", "deck-Revival_CE"]);
  });

  it("refuses with collection editing off, and writes nothing", async () => {
    const one = [{ fileName: "Abzan", edition: "regular", file: "Abzan", actionId: ID(1) }];
    state.collectionEdit = false;
    await expect(addPrecons(one)).rejects.toThrow("the precon pick is off");
    expect(state.picks).toEqual([]);
  });

  // A box the catalog does not hold as asked is that box's own refusal, never the press's throw: a refresh can drop a
  // box or its Collector's Edition twin between a press and its retry, and the pick must be able to let go of it.
  it("refuses a box outside the catalog's closed set on its own, adding the rest", async () => {
    state.selects = [CATALOG];
    const out = await addPrecons([
      { fileName: "Revival_CE", edition: "regular", file: "Revival_CE", actionId: ID(1) }, { fileName: "Abzan", edition: "collector", file: "Abzan_CE", actionId: ID(2) },
      { fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: ID(3) },
    ]);
    expect(state.picks.map((a) => [a[0], a[1], a[3]])).toEqual([["user_1", "Revival_CE", ID(3)]]);
    expect(out).toEqual([{ rowFile: "Revival_CE", ok: false }, { rowFile: "Abzan", ok: false }, { rowFile: "Revival", ok: true, entryId: "entry-Revival_CE", deckId: "deck-Revival_CE" }]);
  });

  it("refuses a malformed request before anything is read or added", async () => {
    await expect(addPrecons([{ fileName: 7, edition: "regular", actionId: ID(1) }])).rejects.toThrow("bad pick");
    await expect(addPrecons([{ fileName: "Abzan", edition: "foil", actionId: ID(1) }])).rejects.toThrow("bad pick");
    await expect(addPrecons([{ fileName: "Abzan", edition: "regular", file: "Abzan", actionId: "nope" }])).rejects.toThrow("bad pick");
    expect(committed.asked).toEqual([]);
    expect(state.picks).toEqual([]);
  });

  // A retry after a lost answer is answered from the entry it wrote before the catalog is read: a refresh that dropped
  // the box since cannot refuse an add that stands, and nothing is added twice.
  it("recovers a committed retry before the catalog, adding only the rest", async () => {
    committed.map = new Map([[ID(2), "Revival_CE"]]);
    state.selects = [[{ fileName: "Abzan", twinOf: null }]];
    const out = await addPrecons([
      { fileName: "Abzan", edition: "regular", file: "Abzan", actionId: ID(1) }, { fileName: "Revival", edition: "collector", file: "Revival_CE", actionId: ID(2) },
    ]);
    expect(committed.asked).toEqual([[ID(1), ID(2)]]);
    expect(state.picks.map((a) => [a[0], a[1], a[3]])).toEqual([["user_1", "Abzan", ID(1)]]);
    expect(out).toEqual([{ rowFile: "Revival", ok: true, entryId: ID(2) }, { rowFile: "Abzan", ok: true, entryId: "entry-Abzan", deckId: "deck-Abzan" }]);
  });

  it("recovers nothing from an entry of another box, and refuses a request naming a box or id twice", async () => {
    committed.map = new Map([[ID(1), "Sultai"]]);
    state.selects = [CATALOG];
    await addPrecons([{ fileName: "Abzan", edition: "regular", file: "Abzan", actionId: ID(1) }]);
    expect(state.picks.map((a) => [a[0], a[1], a[3]])).toEqual([["user_1", "Abzan", ID(1)]]);
    await expect(addPrecons([
      { fileName: "Abzan", edition: "regular", file: "Abzan", actionId: ID(3) }, { fileName: "Abzan", edition: "regular", file: "Abzan", actionId: ID(4) },
    ])).rejects.toThrow("bad pick");
  });

  it("retires nothing when no box landed", async () => {
    state.selects = [CATALOG];
    state.pickResult = () => ({ ok: false, reason: "failed" });
    expect(await addPrecons([{ fileName: "Abzan", edition: "regular", file: "Abzan", actionId: ID(1) }])).toEqual([{ rowFile: "Abzan", ok: false }]);
    expect(state.invalidated).toEqual([]);
  });

  const THREE = [
    { fileName: "Abzan", edition: "regular", file: "Abzan", actionId: ID(1) },
    { fileName: "Sultai", edition: "regular", file: "Sultai", actionId: ID(2) },
    { fileName: "Temur", edition: "regular", file: "Temur", actionId: ID(3) },
  ];

  // Hugh: "If someone owns the precons, we should create the decks." Each box goes through the owned start, which
  // writes the box's add and its deck in one transaction.
  it("makes three decks and adds their cards for three boxes, one owned start per box", async () => {
    state.selects = [CATALOG];
    const out = await addPrecons(THREE);
    expect(state.picks.map((a) => [a[1], a[2], a[3]])).toEqual([["Abzan", "Abzan Armor", ID(1)], ["Sultai", "Sultai Arisen", ID(2)], ["Temur", "Temur Roar", ID(3)]]);
    expect(out).toEqual([
      { rowFile: "Abzan", ok: true, entryId: "entry-Abzan", deckId: "deck-Abzan" },
      { rowFile: "Sultai", ok: true, entryId: "entry-Sultai", deckId: "deck-Sultai" },
      { rowFile: "Temur", ok: true, entryId: "entry-Temur", deckId: "deck-Temur" },
    ]);
    expect(state.revalidated).toEqual(["deck-Abzan", "deck-Sultai", "deck-Temur"]);
  });

  // A retry after a lost answer is answered from the entries and the decks they started: nothing is started again.
  it("makes no second deck on a retry with the same ids, answering with the decks the first try made", async () => {
    committed.map = new Map([[ID(1), "Abzan"], [ID(2), "Sultai"], [ID(3), "Temur"]]);
    committed.decks = new Map([[ID(1), "deck-1"], [ID(2), "deck-2"], [ID(3), "deck-3"]]);
    const out = await addPrecons(THREE);
    expect(state.picks).toEqual([]);
    expect(out).toEqual([
      { rowFile: "Abzan", ok: true, entryId: ID(1), deckId: "deck-1" },
      { rowFile: "Sultai", ok: true, entryId: ID(2), deckId: "deck-2" },
      { rowFile: "Temur", ok: true, entryId: ID(3), deckId: "deck-3" },
    ]);
    expect(state.revalidated).toEqual([]);
  });

  // S7: a box whose deck or cards failed is named, the others land, and nothing is retried.
  it("names the middle box when its start fails, and lands the other two", async () => {
    state.selects = [CATALOG];
    state.pickResult = (f) => (f === "Sultai" ? { ok: false, reason: "failed" } : { ok: true, entryId: `entry-${f}`, deckId: `deck-${f}` });
    const out = await addPrecons(THREE);
    expect(state.picks.map((a) => a[1])).toEqual(["Abzan", "Sultai", "Temur"]);
    expect(out).toEqual([
      { rowFile: "Abzan", ok: true, entryId: "entry-Abzan", deckId: "deck-Abzan" },
      { rowFile: "Sultai", ok: false },
      { rowFile: "Temur", ok: true, entryId: "entry-Temur", deckId: "deck-Temur" },
    ]);
    expect(state.revalidated).toEqual(["deck-Abzan", "deck-Temur"]);
  });
});
