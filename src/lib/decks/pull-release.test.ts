import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { pullReleases } from "../../db/schema";
import { PULL_RELEASE_UPSERT_SET } from "./pull-release";

// `.toSQL()` only — never executed. See the correlated-subquery section of AGENTS.md for why
// this file exists: a query built correctly in TypeScript can still render SQL nobody checked.
//
// Found by the pre-open review of PR 1 (addendum R1, Pull it picks its source deck):
// `onConflictDoUpdate`'s SET clause bumped only `copies`, so a second pull of the same card
// from a source whose row already existed left `created_at` at that row's FIRST pull —
// `latestReleaseSources` (same file) orders by `created_at desc` to find the most recent
// source, and a stale timestamp there would name an older source as the newest.
describe("the pull_releases upsert's SET clause", () => {
  const emitted = () =>
    db
      .insert(pullReleases)
      .values({ userId: "u1", sourceDeckId: "d1", oracleId: "o1", askingDeckId: "d2", copies: 1 })
      .onConflictDoUpdate({
        target: [pullReleases.sourceDeckId, pullReleases.oracleId, pullReleases.askingDeckId],
        set: PULL_RELEASE_UPSERT_SET,
      })
      .toSQL();

  it("bumps created_at as well as copies, so a re-pull from an old source reads as the newest touch", () => {
    const { sql: text } = emitted();
    expect(text).toMatch(/"created_at"\s*=\s*now\(\)/i);
    expect(text).toMatch(/"copies"\s*=\s*"pull_releases"\."copies"\s*\+\s*1/i);
  });
});
