import { describe, it, expect, vi, beforeEach } from "vitest";

const rows = vi.hoisted(() => ({ value: [] as unknown[] }));
const committed = vi.hoisted(() => ({ value: new Map<string, { id: string; name: string }>() }));

// One chainable builder answers both queries this module builds: the ownership
// subquery, which ends at `.as`, and the outer select, which is awaited at
// `.groupBy`. The builder is thenable so the await resolves to the fixture rows.
vi.mock("../../../db", () => {
  const chain: Record<string, unknown> = {
    // The subquery's `.as` stands in for a Drizzle subquery, so it carries the
    // two columns the outer select reads off it. Returning a bare `{}` would
    // hand `undefined` to the join and the group-by, and the test would pass
    // without ever describing the query it claims to.
    as: () => ({ oracleId: "owned.oracle_id", qty: "owned.qty" }),
    then: (resolve: (value: unknown) => void) => resolve(rows.value),
  };
  for (const step of ["from", "innerJoin", "leftJoin", "where", "groupBy"]) {
    chain[step] = () => chain;
  }
  return { db: { select: () => chain } };
});

// Deck membership has its own query and its own tests. Mocked here so this file
// keeps describing one shape of row rather than two.
vi.mock("../../../lib/decks/committed", () => ({
  readCommittedDecks: () => Promise.resolve(committed.value),
}));

import { readSynergyCards } from "./synergy-read";

beforeEach(() => {
  rows.value = [];
  committed.value = new Map();
});

describe("readSynergyCards", () => {
  it("scales synergy's fraction into points and rounds inclusion, which is already a percent", async () => {
    rows.value = [
      { oracleId: "a", name: "Command Tower", typeLine: "Land", inclusion: 82.4, synergy: 0.01, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", ["cmdr"], []);
    expect(out[0].inclusionPct).toBe(82);
    expect(out[0].synergyPts).toBe(1);
  });

  it("keeps a null figure null rather than turning it into a zero", async () => {
    rows.value = [
      { oracleId: "a", name: "Nulls", typeLine: "Instant", inclusion: null, synergy: null, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", ["cmdr"], []);
    expect(out[0].inclusionPct).toBeNull();
    expect(out[0].synergyPts).toBeNull();
  });

  it("orders by synergy and applies the covered-role exclusion", async () => {
    rows.value = [
      { oracleId: "low", name: "Low", typeLine: "Instant", inclusion: 10, synergy: 0.05, ownedQuantity: 0 },
      { oracleId: "high", name: "High", typeLine: "Instant", inclusion: 10, synergy: 0.5, ownedQuantity: 0 },
      { oracleId: "covered", name: "Covered", typeLine: "Artifact", inclusion: 80, synergy: 0.9, ownedQuantity: 2 },
    ];
    const out = await readSynergyCards("user", ["cmdr"], ["covered"]);
    expect(out.map((c) => c.oracleId)).toEqual(["high", "low"]);
  });

  it("reads ownership off the collection quantity", async () => {
    rows.value = [
      { oracleId: "a", name: "Owned", typeLine: "Land", inclusion: null, synergy: 0.2, ownedQuantity: 1 },
      { oracleId: "b", name: "Not", typeLine: "Land", inclusion: null, synergy: 0.1, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", ["cmdr"], []);
    expect(out.map((c) => c.owned)).toEqual([true, false]);
  });

  it("names the deck a card is already committed to, and null for the rest", async () => {
    rows.value = [
      { oracleId: "a", name: "Sol Ring", typeLine: "Artifact", inclusion: null, synergy: 0.2, ownedQuantity: 1 },
      { oracleId: "b", name: "Free", typeLine: "Artifact", inclusion: null, synergy: 0.1, ownedQuantity: 1 },
    ];
    committed.value = new Map([["a", { id: "d1", name: "Atraxa" }]]);
    const out = await readSynergyCards("user", ["cmdr"], []);
    expect(out.map((c) => c.committedTo)).toEqual(["Atraxa", null]);
  });
});
