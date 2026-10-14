// The acknowledgement write, rendered.
//
// This is the `.toSQL()` half AGENTS.md describes: emitted SQL proves the
// question. What it protects is not obvious from reading the call — the upsert
// must NEVER assign the version, because two tabs can hold two different
// versions of the page, and a stale one pressing its dismiss would walk the
// marker backwards and re-show entries the reader has already acknowledged
// somewhere else. `greatest` makes the write monotonic.

import { describe, expect, it } from "vitest";
import { markAboutSeenQuery, markAboutVisitedQuery } from "./read";

/** The writer's OWN query, rendered — never a second copy of it written here.
 *  A hand-rolled twin passes for exactly as long as nobody edits the original,
 *  and then it certifies the wrong statement. */
const emitted = (version: number) => markAboutSeenQuery("user_1", version).toSQL();

describe("the acknowledgement upsert", () => {
  it("updates only when it raises the floor, since a no-op update moves the stamp", () => {
    expect(emitted(2).sql).toMatch(/ where "user_prefs"\."about_version_seen" < \$\d+$/);
  });

  it("takes the greater of the stored version and the incoming one", () => {
    const { sql: text } = emitted(2);
    expect(text).toContain("greatest");
    // Qualified, not a bare column: an unqualified name in a conflict clause
    // resolves against the row being inserted rather than the stored one, which
    // would make `greatest` compare the incoming value to itself.
    expect(text).toContain('"user_prefs"."about_version_seen"');
  });

  it("never assigns the version outright", () => {
    const { sql: text } = emitted(2);
    const setClause = text.slice(text.indexOf("do update set"));
    expect(setClause).not.toMatch(/"about_version_seen"\s*=\s*\$\d+\s*$/);
  });

  it("carries the version as a parameter rather than inlining it", () => {
    const { params } = emitted(2);
    expect(params).toContain(2);
  });
});

describe("the visit upsert (switched entries by id)", () => {
  const emittedVisit = (ids: string[]) => markAboutVisitedQuery("user_1", 9, ids).toSQL();

  it("updates only when the visit raises the floor or adds an id, since a no-op update moves the stamp", () => {
    const { sql: text } = emittedVisit(["locked-cards"]);
    const where = text.slice(text.lastIndexOf(" where "));
    expect(where).toMatch(/"user_prefs"\."about_version_seen" < \$\d+ or not \(array\[\$\d+\]::text\[\] <@ "user_prefs"\."about_seen_ids"\)/);
  });

  it("unions the stored ids with the incoming ones rather than replacing them", () => {
    const { sql: text } = emittedVisit(["locked-cards"]);
    const setClause = text.slice(text.indexOf("do update set"));
    expect(setClause).toContain('"user_prefs"."about_seen_ids" ||');
    expect(setClause).toContain("distinct unnest");
    expect(setClause).not.toMatch(/"about_seen_ids"\s*=\s*\$\d+\s*$/);
  });

  it("carries each id as its own parameter inside an array", () => {
    const { sql: text, params } = emittedVisit(["locked-cards", "change-commander"]);
    expect(text).toMatch(/array\[\$\d+, \$\d+\]::text\[\]/);
    expect(params).toEqual(expect.arrayContaining(["locked-cards", "change-commander"]));
  });

  it("still takes the greater version", () => {
    expect(emittedVisit([]).sql).toContain("greatest");
  });
});
