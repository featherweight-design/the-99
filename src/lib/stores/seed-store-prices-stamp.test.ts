import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown>, order: [] as string[] }));
vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../cache/stamp-catalog", () => ({
  stampCatalogRefresh: vi.fn(async () => { stub.order.push("stamp"); }),
}));
vi.mock("../tokens/publish", () => ({ tokenTablesExist: vi.fn(async () => false) }));

import { stampCatalogRefresh } from "../cache/stamp-catalog";
import type { StorePriceRow } from "./rows";
import { writeStoreRows } from "./seed-store-prices";

const row = (scryfallId: string): StorePriceRow => ({
  scryfallId, store: "tcgplayer", priceCents: 100, priceCentsFoil: null, priceCentsEtched: null,
  quantity: null, quantityFoil: null, quantityEtched: null, buyUrl: null, buyUrlFoil: null, buyUrlEtched: null,
  asOf: new Date(0),
});
const load = { rows: [row("a")], asOf: new Date(0), skipped: 0, collapsed: 0 };

/** A transaction whose card upsert RETURNS `written` rows, so the never-backwards guard can hold every row back. */
function transactionReturning(written: number) {
  stub.db.transaction = async (run: (tx: unknown) => Promise<void>) => {
    await run({
      insert: () => ({ values: () => ({ onConflictDoUpdate: () => ({ returning: async () => Array.from({ length: written }, () => ({ id: "a" })) }) }) }),
    });
    stub.order.push("commit");
  };
}

// The cached list payloads (Home, /decks and its Stats, the all-decks cart) price a reader on another store from
// these rows, and the catalog generation in their key is what retires them.
describe("writeStoreRows' catalog stamp", () => {
  beforeEach(() => {
    stub.order.length = 0;
    vi.mocked(stampCatalogRefresh).mockClear();
    stub.db.select = () => ({ from: () => ({ where: async () => [{ id: "a" }] }) });
  });

  it("stamps once the store's rows have committed", async () => {
    transactionReturning(1);
    await writeStoreRows("tcgplayer", load);
    expect(stub.order).toEqual(["commit", "stamp"]);
  });

  it("does not stamp a run that wrote nothing, so no reader's cached figures are retired for it", async () => {
    transactionReturning(0);
    const r = await writeStoreRows("tcgplayer", load);
    expect(r.heldBack).toBe(1);
    expect(stub.order).toEqual(["commit"]);
  });
});
