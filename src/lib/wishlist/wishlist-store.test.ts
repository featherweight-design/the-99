import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A want's price-drop baseline is read in the reader's store and recorded with it (store preference, design #3200).
const h = vi.hoisted(() => ({
  card: { held: 0, current: null as number | null, chosen: null as string | null },
  inserts: [] as { q: string; params: unknown[] }[],
  loadPrices: vi.fn(),
  readerStore: vi.fn(),
}));

vi.mock("../../db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
      execute: async (q: SQL) => {
        const { sql, params } = new PgDialect().sqlToQuery(q);
        const s = sql.replace(/\s+/g, " ");
        if (s.includes(`insert into "wishlist_items"`)) h.inserts.push({ q: s, params });
        return { rows: s.includes(" as held") ? [h.card] : [] };
      },
      delete: () => ({ where: async () => undefined }),
    }),
  },
}));
vi.mock("../flags/request", () => ({ requestFlags: async () => ({}) }));
vi.mock("../stores/preference", () => ({ readerStore: h.readerStore }));
vi.mock("../decks/price-query", () => ({
  loadPrices: h.loadPrices,
  cheapestNow: (read: { cents: number | null }) => read.cents,
}));

import { setWishlistPrinting, wantOneMore } from "./wishlist";

const CARD = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  h.card = { held: 0, current: null, chosen: null };
  h.inserts = [];
  h.readerStore.mockReset().mockResolvedValue("tcgplayer");
  h.loadPrices.mockReset().mockImplementation(async (_i: unknown, _p: unknown, _n: unknown, store: string) => ({ cents: store === "tcgplayer" ? 420 : 999 }));
});

describe("a want's baseline store", () => {
  it("a new want reads its baseline in the reader's store and records that store", async () => {
    expect(await wantOneMore("u1", CARD)).toEqual({ status: "wanted", quantity: 1, held: 0 });
    expect(h.loadPrices).toHaveBeenCalledWith([CARD], [], [], "tcgplayer");
    expect(h.inserts).toHaveLength(1);
    expect(h.inserts[0].q).toContain("(user_id, oracle_id, quantity, price_at_add_cents, price_store)");
    expect(h.inserts[0].params.slice(-2)).toEqual([420, "tcgplayer"]);
  });

  it("a printing choice re-baselines in the reader's store and moves the line's store with it", async () => {
    h.card = { held: 0, current: 1, chosen: "22222222-2222-4222-8222-222222222222" };
    await setWishlistPrinting("u1", CARD, null);
    expect(h.loadPrices).toHaveBeenCalledWith([CARD], [], [], "tcgplayer");
    expect(h.inserts[0].q).toContain("price_store = excluded.price_store");
    expect(h.inserts[0].params.slice(-2)).toEqual([null, "tcgplayer"]);
    expect(h.inserts[0].params).toContain(420);
  });

  it("with the reader on Mana Pool, the baseline is Mana Pool's", async () => {
    h.readerStore.mockResolvedValue("manapool");
    await wantOneMore("u1", CARD);
    expect(h.inserts[0].params.slice(-2)).toEqual([999, "manapool"]);
  });
});
