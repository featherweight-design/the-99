import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { withinColorIdentity } from "./identity-where";

const dialect = new PgDialect();
const compile = (identity: string[]) => dialect.sqlToQuery(withinColorIdentity(identity));

describe("withinColorIdentity", () => {
  it("matches only colorless cards for a colorless commander", () => {
    const { sql, params } = compile([]);
    expect(sql).toContain("cardinality");
    expect(sql).toContain("= 0");
    expect(params).toEqual([]);
  });

  it("contains-matches for a coloured commander", () => {
    const { sql, params } = compile(["B", "R", "G"]);
    expect(sql).toContain("<@");
    expect(params).toEqual(['{"B","R","G"}']);
  });
});
