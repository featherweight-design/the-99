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
    // Both sides of the wishlist (cart on your wishlist): the hand lines and the synced lines, each the reader's own.
    expect(sql).toMatch(/from wishlist_items hw where hw\.user_id in \(select \$3::text\)/);
    expect(sql).toMatch(/from wishlist_synced sw where sw\.user_id in \(select \$4::text\)/);
    // Each side's "still unmet" test is its own `heldCopies`, tied to the line's columns (no extra bound id).
    expect(sql.replace(/\s+/g, " ")).toContain("ci.user_id = hw.user_id and ci.oracle_id = hw.oracle_id and (hw.scryfall_id::uuid is null");
    expect(sql.replace(/\s+/g, " ")).toContain("ci.user_id = sw.user_id and ci.oracle_id = sw.oracle_id and (null::uuid is null");
    expect(params.slice(0, 4)).toEqual(["user_1", "user_1", "user_1", "user_1"]);
  });

  it("correlates on the outer card by alias, and counts the commander and the partner", () => {
    expect(sql).toContain("ci.oracle_id = c.oracle_id");
    expect(sql).toContain("d.commander_oracle_id = c.oracle_id");
    expect(sql).toContain("d.partner_oracle_id = c.oracle_id");
    expect(sql).toContain("dc.deck_id = d.id and dc.oracle_id = c.oracle_id");
    expect(sql).toContain("hw.oracle_id = c.oracle_id");
    expect(sql).toContain("sw.oracle_id = c.oracle_id");
  });

  // A holding may be up to 2^31 - 1 copies, so a sum across printings can pass an int: no cast, or the read fails.
  it("keeps the owned sum a bigint", () => {
    expect(sql).toMatch(/\), 0\) as owned/);
    expect(sql).not.toMatch(/::int as owned/);
  });

  it("marks a wish only while it is unmet", () => {
    // The union keeps only still-wanted lines (`lines.ts`): held below the want, on either side.
    expect(sql).toContain("hs.owned < hs.quantity as wanted");
    expect(sql).toContain("ss.owned < ss.quantity as wanted");
    expect(sql).toContain("where uh.wanted or us.wanted");
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
