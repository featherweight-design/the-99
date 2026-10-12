import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ selects: [] as unknown[][], wheres: [] as unknown[], written: [] as unknown[], revalidated: [] as string[] }));

vi.mock("../../db", () => {
  const chain = () => {
    const rows = state.selects.shift() ?? [];
    const q: Record<string, unknown> = {};
    for (const k of ["from", "innerJoin", "orderBy"]) q[k] = () => q;
    q.where = (w: unknown) => { state.wheres.push(w); return q; };
    q.then = (res: (v: unknown) => unknown) => Promise.resolve(rows).then(res);
    return q;
  };
  return { db: { select: () => chain(), transaction: (fn: (tx: unknown) => unknown) => fn({}) } };
});
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/precons/flag", () => ({ preconsEnabled: () => true }));
vi.mock("../../lib/decks/revalidate-claims", () => ({ revalidateClaims: (id: string) => state.revalidated.push(id) }));
vi.mock("../../lib/decks/write-imported-deck", () => ({
  writeImportedDeck: async (_tx: unknown, d: unknown) => { state.written.push(d); return "deck-1"; },
}));
vi.mock("next/navigation", () => ({ redirect: (u: string) => { throw new Error(`REDIRECT:${u}`); } }));

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { createDeckFromPrecon } from "./precon-actions";

const lead = (oracleId: string, name: string, over: Record<string, unknown> = {}) => ({
  oracleId, name, typeLine: "Legendary Creature — Eldrazi", oracleText: "", manaCost: "{5}", layout: "normal", commanderLegal: true, ...over,
});

beforeEach(() => { state.selects = []; state.wheres = []; state.written = []; state.revalidated = []; });
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
