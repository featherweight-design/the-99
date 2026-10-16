// Card search's reads: the rank's order, and the signal read's scoping (lock 8) and correlation, by the SQL it emits.
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { nameSearch } from "../cards/name-search";
import { cardSignalsSql, withSignals } from "./search";

const dialect = new PgDialect();
const render = (q: SQL) => dialect.sqlToQuery(q);

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

describe("nameSearch's rank", () => {
  it("is prefix, then word start (space, hyphen or slash), then any match", () => {
    const { sql, params } = render(nameSearch("sol")!.rank);
    expect(sql).toMatch(/case\s+when "cards"\."name" ilike \$1 then 0\s+when "cards"\."name" ilike \$2 or "cards"\."name" ilike \$3\s+or "cards"\."name" ilike \$4 then 1\s+else 2\s+end/);
    expect(params).toEqual(["sol%", "% sol%", "%-sol%", "%/sol%"]);
  });

  it("escapes the query's own wildcards inside every pattern", () => {
    expect(render(nameSearch("5_%x")!.rank).params).toEqual(["5\\_\\%x%", "% 5\\_\\%x%", "%-5\\_\\%x%", "%/5\\_\\%x%"]);
  });
});

describe("cardSignalsSql", () => {
  const { sql, params } = render(cardSignalsSql("user_1", [A, B], true));

  it("scopes every table it reads to the reader", () => {
    expect(sql).toMatch(/from collection_items ci\s+where ci\.user_id = \$1/);
    expect(sql).toMatch(/from decks d\s+where d\.user_id = \$2/);
    expect(sql).toMatch(/from wishlist_items w\s+where w\.user_id = \$3/);
    expect(sql).toMatch(/from collection_items ci2\s+where ci2\.user_id = \$4/);
    expect(params.slice(0, 4)).toEqual(["user_1", "user_1", "user_1", "user_1"]);
  });

  it("correlates on the outer card by alias, and counts the commander and the partner", () => {
    expect(sql).toContain("ci.oracle_id = c.oracle_id");
    expect(sql).toContain("d.commander_oracle_id = c.oracle_id");
    expect(sql).toContain("d.partner_oracle_id = c.oracle_id");
    expect(sql).toContain("dc.deck_id = d.id and dc.oracle_id = c.oracle_id");
    expect(sql).toContain("w.oracle_id = c.oracle_id");
  });

  it("marks a wish only while it is unmet", () => {
    expect(sql).toMatch(/w\.quantity > coalesce\(\(\s+select sum\(ci2\.quantity\)/);
  });

  it("asks for exactly the cards named", () => {
    expect(sql).toMatch(/where c\.oracle_id in \(\$5::uuid, \$6::uuid\)/);
    expect(params.slice(4)).toEqual([A, B]);
  });

  it("reads no wishlist row while the wishlist is off", () => {
    const off = render(cardSignalsSql("user_1", [A], false)).sql;
    expect(off).not.toContain("wishlist_items");
    expect(off).toMatch(/false as wishlist/);
  });
});

describe("withSignals", () => {
  it("lays each card's signals on, and reads a card with none as not owned", () => {
    const hits = [
      { oracleId: A, name: "Sol Ring", imageUri: null, flavorName: null },
      { oracleId: B, name: "Solemn Simulacrum", imageUri: null, flavorName: null },
    ];
    const rows = withSignals(hits, new Map([[A, { owned: 3, decks: ["Ghalta"], wishlist: false }]]));
    expect(rows.map((r) => [r.name, r.owned, r.decks, r.wishlist])).toEqual([
      ["Sol Ring", 3, ["Ghalta"], false],
      ["Solemn Simulacrum", 0, [], false],
    ]);
  });
});
