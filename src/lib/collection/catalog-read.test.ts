// The trust-boundary read: a write takes `scryfall_id` from here and never from the client, so
// what it may match is the whole of the guarantee. The probe proves the answers against a real
// catalog (`probe:collection-write`); this pins the question.
import { describe, expect, it } from "vitest";
import { resolvePrintingsQuery, withHoldings } from "./catalog-read";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

describe("resolvePrintingsQuery", () => {
  it("matches each ref's card, set and collector number together", () => {
    const q = resolvePrintingsQuery([
      { oracleId: A, setCode: "lea", collectorNumber: "1" },
      { oracleId: B, setCode: "c21", collectorNumber: "263" },
    ]).toSQL();
    const tuple = /\("printings"\."oracle_id" = \$\d+ and "printings"\."set_code" = \$\d+ and "printings"\."collector_number" = \$\d+\)/g;
    expect(q.sql.match(tuple)).toHaveLength(2);
    // No card list beside the tuples: that is the shape that pairs one ref's card with another's printing.
    expect(q.sql).not.toMatch(/"oracle_id" in/);
    expect(q.params).toEqual(expect.arrayContaining([A, B, "lea", "1", "c21", "263"]));
    // Its finishes come back with its id, for the finish check.
    expect(q.sql).toMatch(/^select .*"finishes" from "printings"/);
  });
});

describe("withHoldings", () => {
  const tile = (setCode: string, collectorNumber: string, finishes: string[]) => ({
    scryfallId: `${setCode}-${collectorNumber}`, setCode, setName: null, collectorNumber,
    releasedAt: null, imageUri: null, flavorName: null, finishes,
  });

  it("puts each holding on its own printing, per finish, in the catalog's order", () => {
    const out = withHoldings(
      [tile("frc", "21", ["nonfoil"]), tile("c21", "263", ["nonfoil", "foil", "glossy"])],
      [
        { setCode: "c21", collectorNumber: "263", finish: "foil", quantity: 1 },
        { setCode: "c21", collectorNumber: "263", finish: "nonfoil", quantity: 3 },
        // A bare import's holding names no printing, so it is on no tile.
        { setCode: "", collectorNumber: "", finish: "nonfoil", quantity: 2 },
      ],
    );
    expect(out.map((p) => [p.setCode, p.owned])).toEqual([["frc", {}], ["c21", { nonfoil: 3, foil: 1 }]]);
    // A finish outside Scryfall's three is dropped rather than offered.
    expect(out[1].finishes).toEqual(["nonfoil", "foil"]);
  });
});
