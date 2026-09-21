// The pair key's canonical ordering, read off the EMITTED SQL.
//
// Its own file because `synergy-read.test.ts` mocks `../../../db` to capture projections, and a
// mocked builder has no `.toSQL()` — and more to the point, its `where` discards the predicate,
// so the key order is unobservable from any value the reader returns. The first version of this
// assertion lived in that file, asserted the shaped rows in both argument orders, and passed
// IDENTICALLY with `canonicalPair` replaced by the raw arguments. Mutation-verified.
//
// Same reasoning as `src/lib/decks/built.test.ts`: only the emitted SQL can show what a query
// actually asks.
import { describe, expect, it } from "vitest";

import { buildOwnedTotals, pairSupportQuery } from "./synergy-read";

/**
 * THE REAL SUBQUERY, not a stand-in.
 *
 * A plain object cast through `never` does not throw here — which is how the first version of
 * this file passed — but Drizzle renders a non-subquery join target as a BIND PARAMETER:
 * `left join $2 on $3 = …`, with `coalesce($1, 0)` where the column belongs. That SQL could
 * never execute, so every assertion over it was reading a query the app does not run.
 */
const owned = buildOwnedTotals("user_1");

describe("pairSupportQuery", () => {
  it("reads the pair table, and joins the collection as a real subquery", () => {
    const sql = pairSupportQuery("aaa", "bbb", false, owned).toSQL().sql;
    expect(sql).toContain("commander_pair_support_cards");
    // The join target is rendered, not bound. A stand-in object emits `left join $n`, which is
    // the shape that made the first version of this file assert over unexecutable SQL.
    expect(sql).toContain("owned_totals");
    expect(sql).not.toMatch(/left join \$\d/);
  });

  it("orders the pair key canonically, whichever order the caller passes", () => {
    // `decks` stores the primary commander first, meaningfully; the table stores the pair
    // canonically. Passing the caller's order through misses every row whose primary carries
    // the larger id — silently, and forever.
    const forward = pairSupportQuery("aaa", "bbb", false, owned).toSQL();
    const reverse = pairSupportQuery("bbb", "aaa", false, owned).toSQL();
    expect(forward.params).toEqual(reverse.params);

    // And SORTED, not merely "the same both times": a `[b, a]` normalisation would also make
    // the two agree while matching no stored row.
    expect(forward.params.filter((p) => p === "aaa" || p === "bbb")).toEqual(["aaa", "bbb"]);
  });

  it("asks for the image column only when the caller wants it", () => {
    // The same opt-in the merged-singles query makes, for the same reason: this reader serves
    // two routes and only the deck page draws a preview.
    expect(pairSupportQuery("aaa", "bbb", true, owned).toSQL().sql).toContain("image_uri");
    expect(pairSupportQuery("aaa", "bbb", false, owned).toSQL().sql).not.toContain("image_uri");
  });
});
