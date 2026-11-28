import { PgDialect } from "drizzle-orm/pg-core";
import { getTableName, type SQL, type Table } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Cart on your wishlist, call 5: a deck line becomes the player's when they change it, and Remove keeps it off the
// synced set. Every write runs in one transaction, collection lock first, then the sync lock.
const h = vi.hoisted(() => ({
  card: { held: 0, current: null as number | null, chosen: null as string | null },
  synced: false,
  hand: false,
  log: [] as string[],
}));

vi.mock("../../db", () => ({
  db: {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({
      execute: async (q: SQL) => {
        const s = new PgDialect().sqlToQuery(q).sql.replace(/\s+/g, " ");
        if (s.includes("hashtextextended")) h.log.push("collection-lock");
        else if (s.includes("'wishlist-sync'")) h.log.push("sync-lock");
        else if (s.includes(`insert into "wishlist_items"`)) h.log.push("upsert wishlist_items");
        else if (s.includes(" as held")) {
          h.log.push("read");
          expect(s).toContain(`left join "wishlist_synced" s on s.user_id`);
          expect(s).toContain("greatest(coalesce(w.quantity, 0), coalesce(s.quantity, 0))");
        }
        return { rows: s.includes(" as held") ? [h.card] : [] };
      },
      delete: (t: Table) => ({
        where: () => {
          const name = getTableName(t);
          h.log.push(`delete ${name}`);
          const there = name === "wishlist_synced" ? h.synced : name === "wishlist_items" ? h.hand : false;
          return Object.assign(Promise.resolve(undefined), { returning: async () => (there ? [{ oracleId: "x" }] : []) });
        },
      }),
      insert: (t: Table) => ({ values: () => ({ onConflictDoNothing: async () => { h.log.push(`insert ${getTableName(t)}`); } }) }),
    }),
  },
}));
vi.mock("../flags/request", () => ({ requestFlags: async () => ({}) }));
vi.mock("../stores/preference", () => ({ readerStore: async () => "manapool" }));
vi.mock("../decks/price-query", () => ({ loadPrices: async () => ({}), cheapestNow: () => null }));

import { clearWishlistLine, setWishlistPrinting, setWishlistQuantity, wantOneMore } from "./wishlist";

const CARD = "11111111-1111-4111-8111-111111111111";
const PRINTING = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  h.card = { held: 0, current: null, chosen: null };
  h.synced = false;
  h.hand = false;
  h.log = [];
});

describe("convert: a deck line becomes the player's when they change it", () => {
  it("the stepper on a deck line writes a hand line and takes the synced side, with a skip", async () => {
    h.card = { held: 1, current: 3, chosen: null };
    h.synced = true;
    expect(await setWishlistQuantity("u1", CARD, 4)).toEqual({ status: "wanted", quantity: 4, held: 1 });
    expect(h.log).toEqual(["collection-lock", "read", "sync-lock", "delete wishlist_synced", "insert wishlist_sync_skips", "upsert wishlist_items"]);
  });

  it("a step down on a deck line is floored by the synced want, so the line stays", async () => {
    h.card = { held: 2, current: 3, chosen: null };
    h.synced = true;
    expect(await setWishlistQuantity("u1", CARD, 2)).toEqual({ status: "wanted", quantity: 3, held: 2 });
  });

  it("choosing a printing on a deck line keeps its want and makes it the player's", async () => {
    h.card = { held: 0, current: 2, chosen: null };
    h.synced = true;
    expect(await setWishlistPrinting("u1", CARD, PRINTING)).toEqual({ status: "wanted", quantity: 2, held: 0 });
    expect(h.log).toContain("insert wishlist_sync_skips");
  });

  it("a stepper change on a hand line never clears a skip (only an explicit add does)", async () => {
    h.card = { held: 0, current: 2, chosen: null };
    h.hand = true;
    await setWishlistQuantity("u1", CARD, 3);
    expect(h.log).not.toContain("delete wishlist_sync_skips");
    expect(h.log).not.toContain("insert wishlist_sync_skips");
  });

  it("Add to wishlist on a card no deck holds clears an earlier Remove's skip", async () => {
    await wantOneMore("u1", CARD);
    expect(h.log).toEqual(["collection-lock", "read", "sync-lock", "delete wishlist_synced", "delete wishlist_sync_skips", "upsert wishlist_items"]);
  });
});

describe("Remove", () => {
  it("takes both sides and keeps a deck line off the synced set", async () => {
    h.hand = true;
    h.synced = true;
    expect(await clearWishlistLine("u1", CARD)).toBe(true);
    expect(h.log).toEqual(["collection-lock", "delete wishlist_items", "sync-lock", "delete wishlist_synced", "insert wishlist_sync_skips"]);
  });

  it("a hand-only line records no skip", async () => {
    h.hand = true;
    expect(await clearWishlistLine("u1", CARD)).toBe(true);
    expect(h.log).not.toContain("insert wishlist_sync_skips");
  });

  it("a deck-only line answers removed", async () => {
    h.synced = true;
    expect(await clearWishlistLine("u1", CARD)).toBe(true);
  });

  it("nothing there answers false", async () => {
    expect(await clearWishlistLine("u1", CARD)).toBe(false);
  });
});

describe("the sync never converts", () => {
  it("sync.ts writes the synced tables itself and never calls the player's writers", () => {
    const src = readFileSync("src/lib/wishlist/sync.ts", "utf8");
    expect(src).not.toMatch(/from "\.\/wishlist"/);
    expect(src).not.toMatch(/\b(writeWant|setWishlistQuantity|wantOneMore|setWishlistPrinting|clearWishlistLine)\b/);
  });
});
