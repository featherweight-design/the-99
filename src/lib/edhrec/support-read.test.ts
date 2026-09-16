// The support-list query's SHAPE, rendered rather than run.
//
// Every property asserted here is invisible to a unit test of the code
// downstream: `supportOverlap` receives an already-ordered array and
// `loadSupportLists` returns a plain map, so the ordering, the snapshot
// property and the empty-array fallback could all be removed with the whole
// suite staying green. Rendering the SQL is the only place they are visible
// without a database — the same reason `decks/built.test.ts` renders its
// correlated subquery.
import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { supportListsQuery, supportMetaQuery } from "./support-read";

const dialect = new PgDialect();
const rendered = (ids: string[]) => dialect.sqlToQuery(supportListsQuery(ids).getSQL()).sql;

describe("supportListsQuery", () => {
  const sql = rendered(["a", "b"]);

  // The receipts line prints the first three of this array, so the order
  // decides which three cards a reader is shown. Nothing downstream can catch
  // its removal.
  it("orders the card ids by inclusion, descending, nulls last", () => {
    expect(sql).toMatch(/order by\s+"?csc"?\."?inclusion"?\s+desc nulls last/i);
  });

  // The tie-break is what stops two requests disagreeing. Measured 0 null
  // inclusions across 879,446 rows, so it almost never fires — which is exactly
  // why it would be safe to delete by accident.
  it("breaks inclusion ties on the oracle id", () => {
    expect(sql).toMatch(/desc nulls last,\s*"?csc"?\."?oracle_id"?/i);
  });

  // ONE STATEMENT, so the header and the cards share a snapshot. Two selects
  // under read-committed can straddle the index rebuild's transaction and
  // return an old total with new card ids.
  it("reads the header and its cards in a single statement", () => {
    expect(sql.match(/\bselect\b/gi) ?? []).toHaveLength(2); // outer + the aggregate subquery
    expect(sql).toMatch(/array_agg/i);
    expect(sql).toMatch(/commander_support_cards/);
  });

  // A header with no resolved cards is a real reading of zero overlap. Without
  // the coalesce it arrives as null and the caller has to tell that apart from
  // a missing row a second time.
  it("yields an empty array rather than null when a commander has no cards", () => {
    expect(sql).toMatch(/coalesce\(/i);
    expect(sql).toContain("'{}'");
  });

  it("correlates the aggregate to the outer commander", () => {
    expect(sql).toMatch(/csc\."?commander_oracle_id"?\s*=\s*"?commander_support"?\./i);
  });

  it("filters to the commanders asked about", () => {
    expect(sql).toMatch(/in \(/i);
  });
});

// THE ROW'S THREE COLUMNS. A projection or predicate regression here leaves the
// suite green and silently removes the sentence, the gap slot's input or the
// deck count from every owned-lane row — `rankings.test.ts` mocks this loader
// and the payload probe only counts bytes. Named by review.
describe("supportMetaQuery", () => {
  const sql = dialect.sqlToQuery(supportMetaQuery(["a", "b"]).getSQL()).sql;

  it("projects the three columns the row draws, and no card list", () => {
    expect(sql).toMatch(/"?prose"?/i);
    expect(sql).toMatch(/"?tags"?/i);
    expect(sql).toMatch(/"?deck_count"?/i);
    // The point of being separate from `supportListsQuery`: this one must not
    // reach the child table, which is hundreds of rows per commander.
    expect(sql).not.toMatch(/commander_support_cards/i);
  });

  it("narrows to the ids it was given rather than reading the table", () => {
    expect(sql).toMatch(/where/i);
    expect(sql).toMatch(/in \(/i);
  });
});
