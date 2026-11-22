import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// One run of the price job against a scripted database: which statement runs is read off its SQL, so the run's
// store decisions (skip, re-check, keep empty, the store each drop records) are pinned without a database.
const h = vi.hoisted(() => ({
  baselineLines: [] as Record<string, unknown>[],
  candidates: [] as Record<string, unknown>[],
  current: null as Record<string, unknown> | null,
  prices: {} as Record<string, Record<string, number>>,
  baselineWrites: [] as unknown[][],
  loadPrices: vi.fn(),
  lastFeedItemAt: vi.fn(async (..._a: unknown[]): Promise<Date | null> => null),
  recordFeedItem: vi.fn(async (..._a: unknown[]): Promise<boolean> => true),
}));

const text = (q: SQL) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { q: sql.replace(/\s+/g, " "), params };
};

vi.mock("../../db", () => {
  const tx = {
    execute: async (q: SQL) => {
      const { q: s } = text(q);
      if (s.includes("pg_advisory_xact_lock")) return { rows: [] };
      if (s.includes("for update")) return { rows: h.current ? [h.current] : [] };
      return { rows: [], rowCount: 1 };
    },
  };
  return {
    db: {
      execute: async (q: SQL) => {
        const { q: s, params } = text(q);
        if (s.includes("as missing")) return { rows: h.baselineLines };
        if (s.includes(`update "wishlist_items" wi set price_at_add_cents = v.cents`)) {
          h.baselineWrites.push(params);
          return { rows: [], rowCount: (params[0] as unknown[]).length };
        }
        return { rows: h.candidates };
      },
      transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
    },
  };
});
vi.mock("../flags/snapshot", () => ({ readSwitchSnapshot: async () => ({}) }));
// Each reader's env names whether their store choice is on; every reader wants price-drop news.
vi.mock("../flags/resolve", () => ({ resolveEnv: (_b: unknown, _s: unknown, userId: string) => ({ storeOn: userId.startsWith("on") ? "1" : "" }) }));
vi.mock("./flag", () => ({ availableFeedKinds: () => ["price-drop"] }));
vi.mock("../stores/preference", () => ({
  storeOf: (env: { storeOn?: string }, preferred: string | null) => (env.storeOn ? preferred ?? "manapool" : "manapool"),
}));
vi.mock("../decks/price-query", () => ({
  loadPrices: h.loadPrices,
  cheapestNow: (read: { figures: Record<string, number> }, id: string) => read.figures[id] ?? null,
}));
vi.mock("../social/feed-write", () => ({ lastFeedItemAt: h.lastFeedItemAt, recordFeedItem: h.recordFeedItem }));
vi.mock("../push/enqueue", () => ({ newBatchKey: () => "batch" }));

import { noticePriceDrops } from "./price-drop";
import { priceDropKey } from "./price-drop-rule";

const NOW = new Date("2026-11-20T12:00:00Z");
const run = () => noticePriceDrops({} as NodeJS.ProcessEnv, () => NOW);

beforeEach(() => {
  h.baselineLines = [];
  h.candidates = [];
  h.current = null;
  h.prices = {};
  h.baselineWrites = [];
  h.loadPrices.mockReset().mockImplementation(async (_ids: unknown, _p: unknown, _n: unknown, store: string) => ({ store, figures: h.prices[store] ?? {} }));
  h.lastFeedItemAt.mockClear();
  h.recordFeedItem.mockClear();
});

const line = (over: Record<string, unknown>) => ({ user_id: "on-1", oracle_id: "a", scryfall_id: null, missing: false, price_store: "manapool", preferred_store: "tcgplayer", ...over });
const candidate = (over: Record<string, unknown>) => ({
  user_id: "on-1", oracle_id: "a", scryfall_id: null, at_add_cents: 1000, noticed_at: null,
  price_store: "tcgplayer", preferred_store: "tcgplayer", set_code: null, collector_number: null, ...over,
});

describe("noticePriceDrops, store by store", () => {
  it("moves a Mana Pool baseline to the reader's store at that store's figure, naming the preference it read", async () => {
    h.baselineLines = [line({})];
    h.prices = { tcgplayer: { a: 500 } };
    const r = await run();
    expect(h.loadPrices).toHaveBeenCalledWith(["a"], [], [], "tcgplayer");
    // user, card, printing, cents, store, the preference the write re-checks.
    expect(h.baselineWrites).toEqual([[["on-1"], ["a"], [null], [500], ["tcgplayer"], ["tcgplayer"]]]);
    expect(r).toMatchObject({ backfilled: 1, awaiting: 0 });
  });

  it("empties a baseline its new store has no figure for, and leaves an empty line empty, counting both awaiting", async () => {
    h.baselineLines = [line({}), line({ oracle_id: "b", missing: true })];
    h.prices = { tcgplayer: {} };
    const r = await run();
    // Only the baselined line is written (emptied); the empty one is not written again.
    expect(h.baselineWrites).toEqual([[["on-1"], ["a"], [null], [null], ["tcgplayer"], ["tcgplayer"]]]);
    expect(r).toMatchObject({ backfilled: 1, awaiting: 2 });
  });

  it("with the switch off, a TCGplayer baseline moves back to Mana Pool and the line reads Mana Pool's figure", async () => {
    h.baselineLines = [line({ user_id: "off-1", price_store: "tcgplayer" })];
    h.prices = { manapool: { a: 700 } };
    await run();
    expect(h.baselineWrites).toEqual([[["off-1"], ["a"], [null], [700], ["manapool"], ["tcgplayer"]]]);
  });

  it("skips a baselined line whose store is not the reader's, without reading a price or opening a transaction", async () => {
    h.candidates = [candidate({ price_store: "manapool" })];
    const r = await run();
    expect(r).toMatchObject({ otherStore: 1, candidates: 0, noticed: 0 });
    expect(h.loadPrices).not.toHaveBeenCalled();
    expect(h.recordFeedItem).not.toHaveBeenCalled();
  });

  it("records a drop in the reader's store: its cooldown and dedupe week are that store's, and the item names it", async () => {
    h.candidates = [candidate({})];
    h.current = { at_add_cents: 1000, price_store: "tcgplayer", scryfall_id: null, noticed_at: null, unmet: true };
    h.prices = { tcgplayer: { a: 500 } };
    const r = await run();
    expect(h.loadPrices).toHaveBeenCalledWith(["a"], [], [], "tcgplayer");
    expect(h.lastFeedItemAt).toHaveBeenCalledWith(expect.anything(), "on-1", "price-drop", "a", "tcgplayer");
    expect(h.recordFeedItem).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      dedupeKey: priceDropKey("a", NOW, "tcgplayer"),
      data: { fromCents: 1000, toCents: 500, store: "tcgplayer" },
    }));
    expect(r).toMatchObject({ candidates: 1, noticed: 1 });
  });

  it("writes nothing when the line was re-baselined in another store between the read and the lock", async () => {
    h.candidates = [candidate({})];
    h.current = { at_add_cents: 1000, price_store: "manapool", scryfall_id: null, noticed_at: null, unmet: true };
    h.prices = { tcgplayer: { a: 500 } };
    const r = await run();
    expect(h.lastFeedItemAt).not.toHaveBeenCalled();
    expect(h.recordFeedItem).not.toHaveBeenCalled();
    expect(r).toMatchObject({ candidates: 1, noticed: 0 });
  });
});
