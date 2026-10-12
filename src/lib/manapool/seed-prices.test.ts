import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";

const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown>, order: [] as string[] }));
vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("./client", () => ({ fetchManapoolSingles: vi.fn(async () => ({})) }));
vi.mock("./parse", () => ({
  parseManapoolPayload: vi.fn(() => ({ rows: [row("a")], collapsedDuplicates: 0, asOf: new Date(0) })),
}));
vi.mock("../cache/stamp-catalog", () => ({
  stampCatalogRefresh: vi.fn(async () => { stub.order.push("stamp"); }),
}));

vi.mock("../tokens/publish", () => ({
  tokenPriceTablesExist: vi.fn(async () => false),
  countTokenPrintings: vi.fn(async () => 0),
}));

import { stampCatalogRefresh } from "../cache/stamp-catalog";
import { countTokenPrintings, tokenPriceTablesExist } from "../tokens/publish";
import { filterKnownPrintings, partitionFeed, seedPrices } from "./seed-prices";

const row = (scryfallId: string) => ({
  scryfallId, priceCents: 100, priceCentsNm: null,
  priceCentsFoil: null, priceCentsEtched: null,
  availableQuantity: 1, buyUrl: null, asOf: new Date(0),
  productName: null, productSet: null, productNumber: null,
});

it("drops rows whose printing we do not have and counts them", () => {
  // printing_prices.scryfall_id has an FK to printings. The two ingests are not
  // lock-stepped, so ManaPool routinely lists a printing from a set our catalog
  // has not pulled yet. Filtering in memory keeps one unknown id from failing a
  // whole 500-row batch — the same rule seed-printings.ts applies to oracle ids.
  const { rows, skippedOrphan } = filterKnownPrintings(
    [row("a"), row("b"), row("c")],
    new Set(["a", "c"]),
  );
  expect(rows.map((r) => r.scryfallId)).toEqual(["a", "c"]);
  expect(skippedOrphan).toBe(1);
});

it("keeps everything when every id is known", () => {
  const { rows, skippedOrphan } = filterKnownPrintings([row("a")], new Set(["a"]));
  expect(rows).toHaveLength(1);
  expect(skippedOrphan).toBe(0);
});

describe("partitionFeed", () => {
  it("sends a feed row to the cards, the tokens, or nowhere", () => {
    const r = partitionFeed([row("card"), row("token"), row("nobody")], new Set(["card"]), new Set(["token"]));
    expect(r.cardRows.map((x) => x.scryfallId)).toEqual(["card"]);
    expect(r.tokenRows.map((x) => x.scryfallId)).toEqual(["token"]);
    expect(r.skippedOrphan).toBe(1);
  });

  it("counts a token row as an orphan when the token lookup found nothing", () => {
    const r = partitionFeed([row("token")], new Set(), new Set());
    expect(r.tokenRows).toEqual([]);
    expect(r.skippedOrphan).toBe(1);
  });
});

describe("seedPrices", () => {
  beforeEach(() => {
    stub.order.length = 0;
    vi.mocked(stampCatalogRefresh).mockClear();
    stub.db.select = () => ({ from: () => ({ where: async () => [{ scryfallId: "a" }] }) });
  });

  it("stamps the catalog generation once the prices have committed", async () => {
    // Every cached shopping cost is keyed on that generation; without the stamp a weekly
    // refresh leaves readers on last week's prices until the hour ceiling.
    stub.db.transaction = async (run: (tx: unknown) => Promise<void>) => {
      await run({ insert: () => ({ values: () => ({ onConflictDoUpdate: async () => {} }) }) });
      stub.order.push("commit");
    };
    await seedPrices();
    expect(stub.order).toEqual(["commit", "stamp"]);
  });

  it("writes token prices in the same transaction as the card prices, when the token tables exist", async () => {
    vi.mocked(tokenPriceTablesExist).mockResolvedValueOnce(true);
    // Card lookup answers "a"; the token lookup, issued after it, answers the one id left over.
    let lookups = 0;
    stub.db.select = () => ({ from: () => ({ where: async () => (++lookups === 1 ? [{ scryfallId: "a" }] : [{ scryfallId: "t" }]) }) });
    const parsed = await import("./parse");
    vi.mocked(parsed.parseManapoolPayload).mockReturnValueOnce({ rows: [row("a"), row("t")], collapsedDuplicates: 0, asOf: new Date(0) });
    const written: { table: string; rows: number; set: string[] }[] = [];
    stub.db.transaction = async (run: (tx: unknown) => Promise<void>) => {
      await run({
        insert: (table: object) => ({
          values: (rows: unknown[]) => ({
            onConflictDoUpdate: async (arg: { set: Record<string, unknown> }) => {
              written.push({ table: getTableName(table as never), rows: rows.length, set: Object.keys(arg.set) });
            },
          }),
        }),
      });
      stub.order.push("commit");
    };
    const r = await seedPrices();
    expect(r.tokenUpserted).toBe(1);
    expect(r.upserted).toBe(1);
    expect(r.skippedOrphan).toBe(0);
    // One card batch, then one token batch, both before the single commit, each to its own table.
    expect(written.map((w) => [w.table, w.rows])).toEqual([["printing_prices", 1], ["token_printing_prices", 1]]);
    // The token upsert refreshes Mana Pool's product identity too, or it would stay at its first value.
    expect(written[1].set).toEqual(expect.arrayContaining(["productName", "productSet", "productNumber", "priceCents", "asOf"]));
    expect(written[0].set).not.toContain("productName");
    expect(stub.order).toEqual(["commit", "stamp"]);
  });

  it("refuses to write token prices when a populated token catalog matches almost none, and still writes the card prices", async () => {
    vi.mocked(tokenPriceTablesExist).mockResolvedValueOnce(true);
    vi.mocked(countTokenPrintings).mockResolvedValueOnce(3_163);
    let lookups = 0;
    stub.db.select = () => ({ from: () => ({ where: async () => (++lookups === 1 ? [{ scryfallId: "a" }] : [{ scryfallId: "t" }]) }) });
    const parsed = await import("./parse");
    vi.mocked(parsed.parseManapoolPayload).mockReturnValueOnce({ rows: [row("a"), row("t")], collapsedDuplicates: 0, asOf: new Date(0) });
    const written: string[] = [];
    stub.db.transaction = async (run: (tx: unknown) => Promise<void>) => {
      await run({ insert: (t: object) => ({ values: () => ({ onConflictDoUpdate: async () => { written.push(getTableName(t as never)); } }) }) });
      stub.order.push("commit");
    };
    const r = await seedPrices();
    expect(r.tokenRefusal).toMatch(/Token prices were not written: 1 feed rows/);
    expect(r.tokenUpserted).toBe(0);
    expect(written).toEqual(["printing_prices"]);
    expect(stub.order).toEqual(["commit", "stamp"]);
  });

  it("does not enforce the token floor on a database whose token catalog is not filled", async () => {
    vi.mocked(tokenPriceTablesExist).mockResolvedValueOnce(true);
    vi.mocked(countTokenPrintings).mockResolvedValueOnce(12);
    let lookups = 0;
    stub.db.select = () => ({ from: () => ({ where: async () => (++lookups === 1 ? [{ scryfallId: "a" }] : [{ scryfallId: "t" }]) }) });
    const parsed = await import("./parse");
    vi.mocked(parsed.parseManapoolPayload).mockReturnValueOnce({ rows: [row("a"), row("t")], collapsedDuplicates: 0, asOf: new Date(0) });
    stub.db.transaction = async (run: (tx: unknown) => Promise<void>) => {
      await run({ insert: () => ({ values: () => ({ onConflictDoUpdate: async () => {} }) }) });
    };
    const r = await seedPrices();
    expect(r.tokenRefusal).toBeNull();
    expect(r.tokenUpserted).toBe(1);
  });

  it("looks up no token printing and writes no token price while the token price table is absent", async () => {
    // The default mock answers "absent". A later select would be the token lookup.
    let lookups = 0;
    stub.db.select = () => ({ from: () => ({ where: async () => { lookups++; return [{ scryfallId: "a" }]; } }) });
    const written: string[] = [];
    stub.db.transaction = async (run: (tx: unknown) => Promise<void>) => {
      await run({ insert: (t: object) => ({ values: () => ({ onConflictDoUpdate: async () => { written.push(getTableName(t as never)); } }) }) });
    };
    const r = await seedPrices();
    expect(lookups).toBe(1);
    expect(r.tokenUpserted).toBe(0);
    expect(written).toEqual(["printing_prices"]);
  });

  it("stamps nothing when the write fails", async () => {
    stub.db.transaction = async () => { throw new Error("write failed"); };
    await expect(seedPrices()).rejects.toThrow("write failed");
    expect(stampCatalogRefresh).not.toHaveBeenCalled();
  });
});
