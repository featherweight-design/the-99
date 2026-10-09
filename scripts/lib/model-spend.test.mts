import { describe, expect, it } from "vitest";
import { formatSpend, groupSpend } from "./model-spend";
import { systemCallId, systemSpendRow } from "./system-spend";

describe("groupSpend", () => {
  it("sums by origin and feature, counting refunded rows and flagging unpriced ones", () => {
    const g = groupSpend([
      { origin: "player", feature: "tuning", status: "spent", costMicroUsd: 1000 },
      { origin: "player", feature: "tuning", status: "refunded", costMicroUsd: 500 },
      { origin: "player", feature: "tuning", status: "reserved", costMicroUsd: null },
      { origin: "system", feature: "labels", status: "spent", costMicroUsd: 2_000_000 },
    ]);
    expect(g).toEqual([
      { origin: "player", feature: "tuning", calls: 3, unpriced: 1, micro: 1500 },
      { origin: "system", feature: "labels", calls: 1, unpriced: 0, micro: 2_000_000 },
    ]);
    expect(formatSpend(g)).toContain("system  total");
  });
  it("says so for an empty window", () => {
    expect(formatSpend(groupSpend([]))).toBe("No model calls in this window.");
  });
});

describe("systemSpendRow", () => {
  it("states its origin, rounds the cost up and keys the id on the batch", () => {
    const row = systemSpendRow({ feature: "labels", model: "sonnet", usd: 1.7048004, key: "labels:run-1:sonnet" });
    expect(row).toMatchObject({ origin: "system", status: "spent", feature: "labels", userId: "system", costMicroUsd: 1_704_801 });
    expect(row.id).toBe(systemCallId("labels:run-1:sonnet"));
    expect(row.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(systemCallId("a")).not.toBe(systemCallId("b"));
  });
  it("refuses a cost that is not a dollar amount", () => {
    expect(() => systemSpendRow({ feature: "prose", model: "m", usd: Number.NaN })).toThrow();
    expect(() => systemSpendRow({ feature: "prose", model: "m", usd: -1 })).toThrow();
  });
});
