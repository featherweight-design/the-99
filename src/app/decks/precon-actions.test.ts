import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: vi.fn(async () => ENV_VIEW) };
});

const state = vi.hoisted(() => ({
  selects: [] as unknown[][], wheres: [] as unknown[], orders: [] as unknown[], written: [] as unknown[], revalidated: [] as string[],
  enabled: true, addedCopy: true, addResult: null as unknown, addCalls: [] as unknown[][], after: [] as (() => Promise<void>)[],
  invalidated: [] as string[], warmed: [] as string[],
}));

vi.mock("../../db", () => {
  const chain = () => {
    const rows = state.selects.shift() ?? [];
    const q: Record<string, unknown> = {};
    for (const k of ["from", "innerJoin"]) q[k] = () => q;
    q.orderBy = (o: unknown) => { state.orders.push(o); return q; };
    q.where = (w: unknown) => { state.wheres.push(w); return q; };
    q.then = (res: (v: unknown) => unknown) => Promise.resolve(rows).then(res);
    return q;
  };
  return { db: { select: () => chain(), transaction: (fn: (tx: unknown) => unknown) => fn({}) } };
});
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/precons/flag", () => ({ preconsEnabled: () => state.enabled }));
vi.mock("../../lib/precons/add", () => ({
  addPreconForUser: async (...args: unknown[]) => { state.addCalls.push(args); return state.addResult; },
}));
vi.mock("../../lib/collection/added-copy-flag", () => ({ addedCopyEnabled: () => state.addedCopy }));
vi.mock("../../lib/collection/invalidate", () => ({ invalidateCollectionReaders: (id: string) => state.invalidated.push(id) }));
vi.mock("../../lib/recs/warm", () => ({ warmCommanderScores: async (id: string) => { state.warmed.push(id); } }));
vi.mock("next/server", () => ({ after: (fn: () => Promise<void>) => { state.after.push(fn); } }));
vi.mock("../../lib/decks/revalidate-claims", () => ({ revalidateClaims: (id: string) => state.revalidated.push(id) }));
vi.mock("../../lib/decks/write-imported-deck", () => ({
  writeImportedDeck: async (_tx: unknown, d: unknown) => { state.written.push(d); return "deck-1"; },
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { preconCards } from "../../db/schema";
import { addPreconToCollection, createDeckFromPrecon } from "./precon-actions";

const lead = (oracleId: string, name: string, over: Record<string, unknown> = {}) => ({
  oracleId, name, typeLine: "Legendary Creature — Eldrazi", oracleText: "", manaCost: "{5}", layout: "normal", commanderLegal: true, ...over,
});

beforeEach(() => {
  state.selects = []; state.wheres = []; state.orders = []; state.written = []; state.revalidated = [];
  state.enabled = true; state.addedCopy = true; state.addResult = null; state.addCalls = []; state.after = []; state.invalidated = []; state.warmed = [];
});
const params = (w: unknown) => new PgDialect().sqlToQuery(w as SQL).params;

describe("createDeckFromPrecon", () => {
  it("writes the precon's exact list with counts and no printings, and lands on the deck", async () => {
    state.selects = [
      [{ fileName: "EldraziUnbound_CMM", twinOf: null }],
      [
        { oracleId: "zhulodok", quantity: 1, isCommander: true },
        { oracleId: "sol-ring", quantity: 1, isCommander: false },
        { oracleId: "wastes", quantity: 10, isCommander: false },
        { oracleId: "wastes", quantity: 5, isCommander: false },
        { oracleId: "dockside", quantity: 1, isCommander: false },
      ],
      [lead("zhulodok", "Zhulodok, Void Gorger")],
    ];
    await expect(createDeckFromPrecon("EldraziUnbound_CMM", "  My Eldrazi ")).rejects.toThrow("REDIRECT:/decks/deck-1?from=precon");
    expect(state.written).toEqual([{
      userId: "user_1", name: "My Eldrazi", commanderOracleId: "zhulodok", partnerOracleId: null,
      cards: [{ oracleId: "sol-ring", quantity: 1 }, { oracleId: "wastes", quantity: 15 }, { oracleId: "dockside", quantity: 1 }],
      builtFromPrecon: "EldraziUnbound_CMM",
    }]);
    expect(state.revalidated).toEqual(["deck-1"]);
    // The feed's order, so a pair's lead is the commander its page names first.
    expect(state.orders).toEqual([preconCards.position]);
  });

  it("starts a twin's plain edition", async () => {
    state.selects = [[{ fileName: "X_CE", twinOf: "X" }], [{ oracleId: "c", quantity: 1, isCommander: true }], [lead("c", "C")]];
    await expect(createDeckFromPrecon("X_CE", "X")).rejects.toThrow(/REDIRECT/);
    expect((state.written[0] as { builtFromPrecon: string }).builtFromPrecon).toBe("X");
    // The list is read from the plain edition: a twin holds no `precon_cards` rows of its own.
    expect(params(state.wheres[1])).toEqual(["X"]);
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

describe("addPreconToCollection", () => {
  const ACTION = "00000000-0000-4000-8000-000000000001";
  const ADDED = { ok: true, entryId: ACTION, cards: 99, copies: 100, foil: 2, placed: [], tokens: { marked: 8, names: [] } };
  const flush = async () => { for (const fn of state.after) await fn(); };

  it("refuses while precons are off, adding nothing", async () => {
    state.enabled = false;
    await expect(addPreconToCollection("MultiverseReforged_FRC", ACTION)).rejects.toThrow("precons are off");
    expect(state.addCalls).toEqual([]);
  });

  it("refuses a malformed action id, and answers notFound for a malformed file name, adding nothing", async () => {
    await expect(addPreconToCollection("MultiverseReforged_FRC", "not-a-uuid")).rejects.toThrow("bad action id");
    expect(await addPreconToCollection("", ACTION)).toEqual({ ok: false, reason: "notFound" });
    expect(await addPreconToCollection("x".repeat(201), ACTION)).toEqual({ ok: false, reason: "notFound" });
    expect(state.addCalls).toEqual([]);
  });

  it("adds for the signed-in player under the action id, forwarding whether placements are drawn", async () => {
    state.addResult = ADDED;
    await addPreconToCollection("MultiverseReforged_FRC", ACTION);
    state.addedCopy = false;
    await addPreconToCollection("MultiverseReforged_FRC", ACTION);
    expect(state.addCalls.map(([user, file, id, , placements]) => [user, file, id, placements])).toEqual([
      ["user_1", "MultiverseReforged_FRC", ACTION, true],
      ["user_1", "MultiverseReforged_FRC", ACTION, false],
    ]);
  });

  it("invalidates the collection's readers and warms the scores after a success, a retry's included", async () => {
    state.addResult = ADDED;
    expect(await addPreconToCollection("MultiverseReforged_FRC", ACTION)).toEqual(ADDED);
    expect(state.invalidated).toEqual([]);
    await flush();
    expect(state.invalidated).toEqual(["user_1"]);
    expect(state.warmed).toEqual(["user_1"]);
  });

  it("touches no reader when the add fails", async () => {
    state.addResult = { ok: false, reason: "failed" };
    expect(await addPreconToCollection("MultiverseReforged_FRC", ACTION)).toEqual({ ok: false, reason: "failed" });
    expect(state.after).toEqual([]);
  });
});
