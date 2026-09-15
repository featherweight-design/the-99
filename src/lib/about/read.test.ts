// The acknowledgement write, rendered.
//
// This is the `.toSQL()` half AGENTS.md describes: emitted SQL proves the
// question. What it protects is not obvious from reading the call — the upsert
// must NEVER assign the version, because two tabs can hold two different
// versions of the page, and a stale one pressing its dismiss would walk the
// marker backwards and re-show entries the reader has already acknowledged
// somewhere else. `greatest` makes the write monotonic.

import { describe, expect, it } from "vitest";
import { markAboutSeenQuery } from "./read";

/** The writer's OWN query, rendered — never a second copy of it written here.
 *  A hand-rolled twin passes for exactly as long as nobody edits the original,
 *  and then it certifies the wrong statement. */
const emitted = (version: number) => markAboutSeenQuery("user_1", version).toSQL();

describe("the acknowledgement upsert", () => {
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
