import { describe, expect, it } from "vitest";
import type { CollectionRow } from "../manabox/parse";
import { collectionItemKey } from "./key";
import { aggregatePendingItems, toCollectionItemValues, totalQuantity, type PendingItem } from "./pending";

const matchRow = (over: Partial<CollectionRow> = {}, oracleId = "o-1") => ({
  oracleId,
  row: {
    name: "Sol Ring", setCode: "c21", collectorNumber: "263", quantity: 1,
    scryfallId: "s-1", finish: "nonfoil" as const, condition: "near_mint", line: 2,
    ...over,
  },
});

describe("aggregatePendingItems", () => {
  it("merges rows that share the whole primary key", () => {
    const items = aggregatePendingItems([matchRow({ quantity: 2 }), matchRow({ quantity: 3 })]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it("carries the upload's name for the card, so a write can name it if the catalog drops it", () => {
    expect(aggregatePendingItems([matchRow()])[0].name).toBe("Sol Ring");
  });

  it("keeps two finishes of one printing apart (they are two primary keys)", () => {
    const items = aggregatePendingItems([matchRow(), matchRow({ finish: "foil" })]);
    expect(items.map((i) => i.finish).sort()).toEqual(["foil", "nonfoil"]);
  });

  it("keeps two collector numbers within one set apart", () => {
    const items = aggregatePendingItems([matchRow(), matchRow({ collectorNumber: "600" })]);
    expect(items).toHaveLength(2);
  });

  it("keeps the same printing under two oracle ids apart", () => {
    const items = aggregatePendingItems([matchRow({}, "o-1"), matchRow({}, "o-2")]);
    expect(items).toHaveLength(2);
  });

  it("emits one item per distinct aggregation key and no duplicates", () => {
    // A duplicate key here is exactly the 23505 the delete-then-plain-insert path would raise.
    const items = aggregatePendingItems([
      matchRow(), matchRow(), matchRow({ finish: "etched" }), matchRow({ setCode: "lea" }),
    ]);
    const keys = items.map((i) => collectionItemKey({
      oracleId: i.oracleId, setCode: i.setCode,
      collectorNumber: i.collectorNumber!, finish: i.finish!,
    }));
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(3);
  });

  it("collapses scryfallId to null when rows inside a group disagree", () => {
    // Two exports naming different printings of the same (oracle, set, number, finish) cannot
    // both be right; null is the honest answer and lets browse fall to the representative.
    const items = aggregatePendingItems([matchRow(), matchRow({ scryfallId: "s-2" })]);
    expect(items[0].scryfallId).toBeNull();
  });

  it("keeps scryfallId when every row in the group agrees", () => {
    const items = aggregatePendingItems([matchRow(), matchRow()]);
    expect(items[0].scryfallId).toBe("s-1");
  });

  it("collapses condition to null on disagreement, as it always has", () => {
    const items = aggregatePendingItems([matchRow(), matchRow({ condition: "played" })]);
    expect(items[0].condition).toBeNull();
  });
});

describe("totalQuantity", () => {
  it("sums the holdings into the review screen's card count", () => {
    expect(totalQuantity(aggregatePendingItems([matchRow({ quantity: 2 }), matchRow({ setCode: "lea", quantity: 4 })])))
      .toBe(6);
  });
});

describe("toCollectionItemValues", () => {
  it("carries printing identity through to the insert", () => {
    const [value] = toCollectionItemValues("user_1", aggregatePendingItems([matchRow({ finish: "etched" })]));
    expect(value).toMatchObject({
      userId: "user_1", oracleId: "o-1", setCode: "c21",
      collectorNumber: "263", finish: "etched", scryfallId: "s-1",
    });
  });

  it("coerces a pre-0008 preview payload rather than spreading undefined", () => {
    // Spreading `undefined` writes NULL — it does NOT take the column default — and
    // collector_number/finish are NOT NULL, so an old payload confirmed after the migration
    // would fail the insert without this.
    const legacy: PendingItem = { oracleId: "o-1", setCode: "c21", condition: null, quantity: 2 };
    const [value] = toCollectionItemValues("user_1", [legacy]);
    expect(value.collectorNumber).toBe("");
    expect(value.finish).toBe("nonfoil");
    expect(value.scryfallId).toBeNull();
  });

  it("lowercases a set code from a pre-0008 payload written before parse-time lowercasing", () => {
    const legacy: PendingItem = { oracleId: "o-1", setCode: "C21", condition: null, quantity: 1 };
    expect(toCollectionItemValues("user_1", [legacy])[0].setCode).toBe("c21");
  });

  it("falls back to nonfoil for a finish outside the check constraint's vocabulary", () => {
    const rogue = { oracleId: "o-1", setCode: "c21", collectorNumber: "1", finish: "gilded", condition: null, quantity: 1 } as unknown as PendingItem;
    expect(toCollectionItemValues("user_1", [rogue])[0].finish).toBe("nonfoil");
  });
});
