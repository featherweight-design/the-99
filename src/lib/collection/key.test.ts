import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { collectionItems } from "../../db/schema";
import { COLLECTION_ITEM_KEY_FIELDS, FINISHES, collectionItemKey, isFinish } from "./key";

/**
 * The load-bearing invariant of migration 0008.
 *
 * `confirmUpload` deletes the user's rows and then runs a plain INSERT — no ON CONFLICT — so
 * if the aggregation key is coarser than the primary key Postgres raises 23505 mid-import, and
 * if it is finer a holding silently splits in two. Asserting the field list against the real
 * table definition means adding a column to the primary key without adding it to the key fails
 * here rather than in production.
 */
describe("collection_items aggregation key", () => {
  const config = getTableConfig(collectionItems);
  const pk = config.primaryKeys[0];

  it("is the primary key, minus user_id, in primary-key order", () => {
    const pkColumns = pk.columns.map((c) => c.name);
    expect(pkColumns[0]).toBe("user_id"); // aggregation happens within one user
    const columnByField = Object.fromEntries(
      Object.entries(collectionItems).map(([field, col]) => [field, (col as { name: string }).name]),
    );
    expect(COLLECTION_ITEM_KEY_FIELDS.map((f) => columnByField[f])).toEqual(pkColumns.slice(1));
  });

  it("covers exactly the printing-identity columns 0008 introduced", () => {
    expect(pk.columns.map((c) => c.name)).toEqual([
      "user_id", "oracle_id", "set_code", "collector_number", "finish",
    ]);
  });

  it("no longer carries the dropped `foil` boolean", () => {
    expect(config.columns.map((c) => c.name)).not.toContain("foil");
  });

  it("distinguishes two finishes of the same printing", () => {
    const base = { oracleId: "o-1", setCode: "c21", collectorNumber: "263" } as const;
    expect(collectionItemKey({ ...base, finish: "nonfoil" }))
      .not.toBe(collectionItemKey({ ...base, finish: "foil" }));
  });

  it("distinguishes two collector numbers within one set", () => {
    const base = { oracleId: "o-1", setCode: "c21", finish: "nonfoil" } as const;
    expect(collectionItemKey({ ...base, collectorNumber: "263" }))
      .not.toBe(collectionItemKey({ ...base, collectorNumber: "600" }));
  });

  it("treats identical identities as one holding", () => {
    const identity = { oracleId: "o-1", setCode: "c21", collectorNumber: "263", finish: "foil" } as const;
    expect(collectionItemKey(identity)).toBe(collectionItemKey({ ...identity }));
  });

  it("carries Scryfall's finish vocabulary verbatim", () => {
    expect([...FINISHES]).toEqual(["nonfoil", "foil", "etched"]);
    expect(isFinish("foil")).toBe(true);
    expect(isFinish("shiny")).toBe(false);
  });
});
