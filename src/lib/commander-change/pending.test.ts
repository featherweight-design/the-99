import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { commanderMoved } from "./pending";
import { commanderMovedSql } from "./pending-sql";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";
const C = "00000000-0000-0000-0000-00000000000c";

describe("commanderMoved", () => {
  it("is false for the same single commander", () => {
    expect(commanderMoved({ commanderOracleId: A, partnerOracleId: null }, { commanderOracleId: A, partnerOracleId: null })).toBe(false);
  });

  it("is true when the single commander changed", () => {
    expect(commanderMoved({ commanderOracleId: A, partnerOracleId: null }, { commanderOracleId: B, partnerOracleId: null })).toBe(true);
  });

  it("is false when a pair only exchanged columns", () => {
    expect(commanderMoved({ commanderOracleId: A, partnerOracleId: B }, { commanderOracleId: B, partnerOracleId: A })).toBe(false);
  });

  it("is true when one half of a pair changed", () => {
    expect(commanderMoved({ commanderOracleId: A, partnerOracleId: B }, { commanderOracleId: A, partnerOracleId: C })).toBe(true);
  });

  it("is true when a partner was added or removed", () => {
    expect(commanderMoved({ commanderOracleId: A, partnerOracleId: null }, { commanderOracleId: A, partnerOracleId: B })).toBe(true);
    expect(commanderMoved({ commanderOracleId: A, partnerOracleId: B }, { commanderOracleId: A, partnerOracleId: null })).toBe(true);
  });
});

describe("commanderMovedSql", () => {
  it("compares both aliases' sorted, non-null pairs with is distinct from", () => {
    const { sql: text } = new PgDialect().sqlToQuery(commanderMovedSql("dv", "dk"));
    expect(text).toContain("array[dv.commander_oracle_id, dv.partner_oracle_id]");
    expect(text).toContain("array[dk.commander_oracle_id, dk.partner_oracle_id]");
    expect(text).toContain("where x is not null order by x");
    expect(text).toContain("is distinct from");
  });
});
