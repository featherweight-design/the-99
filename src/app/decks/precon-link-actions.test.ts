import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  selects: [] as unknown[][], updated: [] as unknown[][], sets: [] as unknown[], wheres: [] as unknown[], revalidated: [] as unknown[][],
}));

vi.mock("../../db", () => {
  const select = () => {
    const rows = state.selects.shift() ?? [];
    const q: Record<string, unknown> = {};
    q.from = () => q;
    q.where = (w: unknown) => { state.wheres.push(w); return q; };
    q.then = (res: (v: unknown) => unknown) => Promise.resolve(rows).then(res);
    return q;
  };
  const update = () => {
    const q: Record<string, unknown> = {};
    q.set = (v: unknown) => { state.sets.push(v); return q; };
    q.where = (w: unknown) => { state.wheres.push(w); return q; };
    q.returning = () => Promise.resolve(state.updated.shift() ?? []);
    return q;
  };
  return { db: { select, update } };
});
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/precons/flag", () => ({ preconsEnabled: () => true }));
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => state.revalidated.push(a) }));

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { linkPrecon, unlinkPrecon } from "./precon-link-actions";

const rendered = (w: unknown) => new PgDialect().sqlToQuery(w as SQL);

beforeEach(() => { state.selects = []; state.updated = []; state.sets = []; state.wheres = []; state.revalidated = []; });

describe("linkPrecon", () => {
  it("writes the precon to the deck's built_from_precon and nothing else (locks 3 to 6)", async () => {
    state.selects = [[{ fileName: "EldraziUnbound_CMM", twinOf: null }]];
    state.updated = [[{ id: "deck-1" }]];
    await linkPrecon("deck-1", "EldraziUnbound_CMM");
    expect(state.sets).toEqual([{ builtFromPrecon: "EldraziUnbound_CMM" }]);
  });

  it("links a Collector's Edition twin to its plain edition (lock 1)", async () => {
    state.selects = [[{ fileName: "X_CE", twinOf: "X" }]];
    state.updated = [[{ id: "deck-1" }]];
    await linkPrecon("deck-1", "X_CE");
    expect(state.sets).toEqual([{ builtFromPrecon: "X" }]);
  });

  it("scopes the write to the reader's own deck, and refuses one it does not own", async () => {
    state.selects = [[{ fileName: "X", twinOf: null }]];
    state.updated = [[]];
    await expect(linkPrecon("someone-elses", "X")).rejects.toThrow("deck not found");
    const { sql, params } = rendered(state.wheres[1]);
    expect(sql).toBe(`("decks"."id" = $1 and "decks"."user_id" = $2)`);
    expect(params).toEqual(["someone-elses", "user_1"]);
    expect(state.revalidated).toEqual([]);
  });

  it("refuses an unknown precon before writing", async () => {
    state.selects = [[]];
    await expect(linkPrecon("deck-1", "Nope")).rejects.toThrow("precon not found");
    expect(state.sets).toEqual([]);
  });

  it("revalidates the deck's surfaces and both precon routes", async () => {
    state.selects = [[{ fileName: "X", twinOf: null }]];
    state.updated = [[{ id: "deck-1" }]];
    await linkPrecon("deck-1", "X");
    expect(state.revalidated).toEqual(expect.arrayContaining([
      ["/decks/deck-1"], ["/decks/precons"], ["/decks/precons/[fileName]", "page"],
    ]));
  });
});

describe("unlinkPrecon", () => {
  it("clears the link and nothing else", async () => {
    state.updated = [[{ id: "deck-1" }]];
    await unlinkPrecon("deck-1");
    expect(state.sets).toEqual([{ builtFromPrecon: null }]);
  });

  it("refuses a deck the reader does not own", async () => {
    state.updated = [[]];
    await expect(unlinkPrecon("deck-2")).rejects.toThrow("deck not found");
  });
});
