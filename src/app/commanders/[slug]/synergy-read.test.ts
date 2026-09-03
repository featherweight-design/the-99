import { describe, it, expect, vi, beforeEach } from "vitest";

const rows = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock("../../../db", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          leftJoin: () => ({
            where: () => ({ groupBy: () => Promise.resolve(rows.value) }),
          }),
        }),
      }),
    }),
  },
}));

import { readSynergyCards } from "./synergy-read";

beforeEach(() => {
  rows.value = [];
});

describe("readSynergyCards", () => {
  it("converts EDHREC's fraction to whole points and its inclusion to a percent", async () => {
    rows.value = [
      { oracleId: "a", name: "Command Tower", typeLine: "Land", inclusion: 0.82, synergy: 0.01, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", "cmdr", []);
    expect(out[0].inclusionPct).toBe(82);
    expect(out[0].synergyPts).toBe(1);
  });

  it("keeps a null figure null rather than turning it into a zero", async () => {
    rows.value = [
      { oracleId: "a", name: "Nulls", typeLine: "Instant", inclusion: null, synergy: null, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", "cmdr", []);
    expect(out[0].inclusionPct).toBeNull();
    expect(out[0].synergyPts).toBeNull();
  });

  it("orders by synergy and applies the covered-role exclusion", async () => {
    rows.value = [
      { oracleId: "low", name: "Low", typeLine: "Instant", inclusion: 10, synergy: 0.05, ownedQuantity: 0 },
      { oracleId: "high", name: "High", typeLine: "Instant", inclusion: 10, synergy: 0.5, ownedQuantity: 0 },
      { oracleId: "covered", name: "Covered", typeLine: "Artifact", inclusion: 80, synergy: 0.9, ownedQuantity: 2 },
    ];
    const out = await readSynergyCards("user", "cmdr", ["covered"]);
    expect(out.map((c) => c.oracleId)).toEqual(["high", "low"]);
  });

  it("reads ownership off the collection quantity", async () => {
    rows.value = [
      { oracleId: "a", name: "Owned", typeLine: "Land", inclusion: null, synergy: 0.2, ownedQuantity: 1 },
      { oracleId: "b", name: "Not", typeLine: "Land", inclusion: null, synergy: 0.1, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", "cmdr", []);
    expect(out.map((c) => c.owned)).toEqual([true, false]);
  });
});
