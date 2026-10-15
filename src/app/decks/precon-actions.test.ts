import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: vi.fn(async () => ENV_VIEW) };
});

const state = vi.hoisted(() => ({
  selects: [] as unknown[][], wheres: [] as unknown[], orders: [] as unknown[], written: [] as unknown[], revalidated: [] as string[],
  enabled: true, collectionEdit: true, addedCopy: true, addResult: null as unknown, addCalls: [] as unknown[][], after: [] as (() => Promise<void>)[],
  invalidated: [] as string[], warmed: [] as string[], committed: [] as unknown[],
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
vi.mock("../../lib/precons/flag", () => ({ preconsEnabled: () => state.enabled }));
vi.mock("../../lib/precons/start-owned", () => ({
  startPreconOwned: async (...args: unknown[]) => { state.addCalls.push(args); return state.addResult; },
}));
vi.mock("../../lib/collection/edit-flag", () => ({ collectionEditEnabled: () => state.collectionEdit }));
vi.mock("../../lib/collection/added-copy-flag", () => ({ addedCopyEnabled: () => state.addedCopy }));
vi.mock("../../lib/collection/invalidate", () => ({ invalidateCollectionReaders: (id: string) => state.invalidated.push(id) }));
vi.mock("../../lib/recs/warm", () => ({ warmCommanderScores: async (id: string) => { state.warmed.push(id); } }));
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
import { createDeckFromPrecon, startPreconOwned } from "./precon-actions";

const lead = (oracleId: string, name: string, over: Record<string, unknown> = {}) => ({
  oracleId, name, typeLine: "Legendary Creature — Eldrazi", oracleText: "", manaCost: "{5}", layout: "normal", commanderLegal: true, ...over,
});

beforeEach(() => {
  state.selects = []; state.wheres = []; state.orders = []; state.written = []; state.revalidated = []; state.committed = [];
  state.enabled = true; state.collectionEdit = true; state.addedCopy = true; state.addResult = null; state.addCalls = []; state.after = []; state.invalidated = []; state.warmed = [];
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

  it("refuses while precons are off, writing nothing", async () => {
    state.enabled = false;
    await expect(startPreconOwned("MultiverseReforged_FRC", "M", ACTION)).rejects.toThrow("precons are off");
    expect(state.addCalls).toEqual([]);
  });

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
    state.addedCopy = false;
    await expect(startPreconOwned("MultiverseReforged_FRC", "Mine", ACTION)).rejects.toThrow(/REDIRECT/);
    expect(state.addCalls.map(([user, file, name, id, , placements]) => [user, file, name, id, placements])).toEqual([
      ["user_1", "MultiverseReforged_FRC", "Mine", ACTION, true],
      ["user_1", "MultiverseReforged_FRC", "Mine", ACTION, false],
    ]);
    expect(state.revalidated).toEqual(["deck-9", "deck-9"]);
  });

  it("invalidates the collection's readers and warms the scores after a start", async () => {
    state.addResult = STARTED;
    await expect(startPreconOwned("MultiverseReforged_FRC", "M", ACTION)).rejects.toThrow(/REDIRECT/);
    expect(state.invalidated).toEqual([]);
    await flush();
    expect(state.invalidated).toEqual(["user_1"]);
    expect(state.warmed).toEqual(["user_1"]);
  });

  it("returns a refusal for the dialog to say, touching no reader", async () => {
    state.addResult = { ok: false, reason: "failed" };
    expect(await startPreconOwned("MultiverseReforged_FRC", "M", ACTION)).toEqual({ ok: false, reason: "failed" });
    expect(state.after).toEqual([]);
    expect(state.revalidated).toEqual([]);
  });
});
