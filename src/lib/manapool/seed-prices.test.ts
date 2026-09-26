import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ db: {} as Record<string, unknown>, order: [] as string[] }));
vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("./client", () => ({ fetchManapoolSingles: vi.fn(async () => ({})) }));
vi.mock("./parse", () => ({
  parseManapoolPayload: vi.fn(() => ({ rows: [row("a")], collapsedDuplicates: 0, asOf: new Date(0) })),
}));
vi.mock("../cache/stamp-catalog", () => ({
  stampCatalogRefresh: vi.fn(async () => { stub.order.push("stamp"); }),
}));

import { stampCatalogRefresh } from "../cache/stamp-catalog";
import { filterKnownPrintings, seedPrices } from "./seed-prices";

const row = (scryfallId: string) => ({
  scryfallId, priceCents: 100, priceCentsNm: null,
  priceCentsFoil: null, priceCentsEtched: null,
  availableQuantity: 1, buyUrl: null, asOf: new Date(0),
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

  it("stamps nothing when the write fails", async () => {
    stub.db.transaction = async () => { throw new Error("write failed"); };
    await expect(seedPrices()).rejects.toThrow("write failed");
    expect(stampCatalogRefresh).not.toHaveBeenCalled();
  });
});
