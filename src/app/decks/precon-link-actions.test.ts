import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: vi.fn(async () => ENV_VIEW) };
});

const state = vi.hoisted(() => ({
  selects: [] as unknown[][], inserted: [] as unknown[], updated: [] as unknown[][], sets: [] as unknown[], wheres: [] as unknown[], revalidated: [] as unknown[][],
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
  const insert = () => {
    const q: Record<string, unknown> = {};
    q.values = (v: unknown) => { state.inserted.push(v); return q; };
    q.onConflictDoUpdate = () => q;
    q.then = (res: (v: unknown) => unknown) => Promise.resolve([]).then(res);
    return q;
  };
  return { db: { select, update, insert } };
});
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/precons/flag", () => ({ preconsEnabled: () => true }));
vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => state.revalidated.push(a) }));

import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { dismissPreconSuggestions, linkPrecon, unlinkPrecon } from "./precon-link-actions";

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
    await unlinkPrecon("deck-1", "EldraziUnbound_CMM");
    expect(state.sets).toEqual([{ builtFromPrecon: null }]);
  });

  it("clears only the link the confirm named, so a stale confirm leaves a newer link standing", async () => {
    state.updated = [[]];
    await expect(unlinkPrecon("deck-1", "EldraziUnbound_CMM")).rejects.toThrow("deck not found");
    const { sql, params } = rendered(state.wheres[0]);
    expect(sql).toBe(`("decks"."id" = $1 and "decks"."user_id" = $2 and "decks"."built_from_precon" = $3)`);
    expect(params).toEqual(["deck-1", "user_1", "EldraziUnbound_CMM"]);
    expect(state.revalidated).toEqual([]);
  });

  it("refuses a deck the reader does not own", async () => {
    state.updated = [[]];
    await expect(unlinkPrecon("deck-2", "X")).rejects.toThrow("deck not found");
  });
});

describe("dismissPreconSuggestions (deck messages A11)", () => {
  const DECK = "7d0a1c1e-4d1a-4b9a-8d3c-2f7a5a9e1b11";
  beforeEach(() => { state.inserted = []; state.selects = []; });

  it("records one key per deck and precon on the reader's account", async () => {
    state.selects = [[{ id: DECK }]];
    await dismissPreconSuggestions(DECK, ["A", "B"]);
    expect(state.inserted).toEqual([{ userId: "user_1", preconSuggestionsDismissed: [`${DECK}:A`, `${DECK}:B`] }]);
  });

  it("writes nothing for a deck the reader does not own", async () => {
    state.selects = [[]];
    await expect(dismissPreconSuggestions(DECK, ["A"])).rejects.toThrow("deck not found");
    expect(state.inserted).toEqual([]);
  });

  it("refuses a malformed deck id or precon list before reading anything", async () => {
    await expect(dismissPreconSuggestions("deck-1", ["A"])).rejects.toThrow("deck not found");
    await expect(dismissPreconSuggestions(DECK, [])).rejects.toThrow("precon not found");
    await expect(dismissPreconSuggestions(DECK, ["A", "B", "C"])).rejects.toThrow("precon not found");
    await expect(dismissPreconSuggestions(DECK, ["x".repeat(201)])).rejects.toThrow("precon not found");
    expect(state.inserted).toEqual([]);
  });
});
