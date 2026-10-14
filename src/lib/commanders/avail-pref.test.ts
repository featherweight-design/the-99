// The saved-mode write, rendered, and the guard every value passes through on its way in.

import { describe, expect, it } from "vitest";
import { isAvail, writeCommandersAvailQuery } from "./avail-pref";

describe("the saved-mode upsert", () => {
  const { sql: text, params } = writeCommandersAvailQuery("user_1", "free").toSQL();
  const setClause = text.slice(text.indexOf("do update set"));

  it("updates only when the mode changes, since a no-op update still moves the reader's stamp", () => {
    expect(setClause).toMatch(/where "user_prefs"\."commanders_avail" is distinct from \$\d+/);
  });

  it("sets the mode and nothing else on an existing row", () => {
    expect(setClause).toContain('"commanders_avail"');
    // The row also holds the About state, which this write must never move.
    expect(setClause).not.toContain("about_version_seen");
    expect(setClause).not.toContain("about_seen_ids");
  });

  it("keys the conflict on the account", () => {
    expect(text).toContain('on conflict ("user_id")');
  });

  it("carries the mode as a parameter", () => {
    expect(params).toContain("free");
  });
});

describe("isAvail", () => {
  it("admits the two modes and nothing else", () => {
    expect(isAvail("all")).toBe(true);
    expect(isAvail("free")).toBe(true);
    for (const value of ["", "FREE", "any", null, undefined, 1, {}]) expect(isAvail(value)).toBe(false);
  });
});
