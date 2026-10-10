// The trust-boundary read: a write takes `scryfall_id` from here and never from the client, so
// what it may match is the whole of the guarantee. The probe proves the answers against a real
// catalog (`probe:collection-write`); this pins the question.
import { describe, expect, it } from "vitest";
import { resolvePrintingsQuery } from "./catalog-read";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

describe("resolvePrintingsQuery", () => {
  it("matches each ref's set AND collector number together, within the refs' cards", () => {
    const q = resolvePrintingsQuery([
      { oracleId: A, setCode: "lea", collectorNumber: "1" },
      { oracleId: B, setCode: "c21", collectorNumber: "263" },
    ]).toSQL();
    const pair = /\("printings"\."set_code" = \$\d+ and "printings"\."collector_number" = \$\d+\)/g;
    expect(q.sql.match(pair)).toHaveLength(2);
    expect(q.sql).toMatch(/"printings"\."oracle_id" in \(\$\d+, \$\d+\)/);
    expect(q.params).toEqual(expect.arrayContaining([A, B, "lea", "1", "c21", "263"]));
    // Its finishes come back with its id, for the finish check.
    expect(q.sql).toMatch(/^select .*"finishes" from "printings"/);
  });
});
