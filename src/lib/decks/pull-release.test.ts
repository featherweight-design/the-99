import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { pullReleases } from "../../db/schema";
import {
  latestReleaseSourcesQuery,
  newestPerCard,
  pullReleaseInsertValues,
  PULL_RELEASE_UPSERT_SET,
} from "./pull-release";

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
    // `clock_timestamp()`, not `now()` — round-3 finding: `now()` is fixed at the transaction's
    // START, before this statement waits on the row lock a concurrent pull could hold, so a pull
    // that queued behind another could stamp an EARLIER time than the one it followed. See
    // `touch.ts` for the same rule on an analogous stamp.
    expect(text).toMatch(/"created_at"\s*=\s*clock_timestamp\(\)/i);
    expect(text).toMatch(/"copies"\s*=\s*"pull_releases"\."copies"\s*\+\s*1/i);
  });

  // Round-7 finding: the conflict path's clock_timestamp() fix did not cover the INSERT path —
  // a first pull still relied on the column's own `defaultNow()` (SQL `now()`), the identical
  // transaction-start-time trap.
  it("stamps the insert row with clock_timestamp(), not the column's now()-based default", () => {
    const values = pullReleaseInsertValues({
      userId: "u1", sourceDeckId: "d1", oracleId: "o1", askingDeckId: "d2",
    });
    const { sql: text } = db.insert(pullReleases).values(values).toSQL();
    expect(text).toMatch(/insert into "pull_releases".*clock_timestamp\(\)/i);
    expect(text).not.toMatch(/\bnow\(\)/i);
  });
});

// Found by Copilot's round-1 review: the newest-wins reduction itself (`newestPerCard`,
// extracted so it can be tested without a database) had no test — only the upsert's SET
// clause did, so changing the reduction could regress silently.
describe("newestPerCard", () => {
  it("picks the newer of two sources for the same card, when given newest first", () => {
    const result = newestPerCard([
      { oracleId: "o1", sourceDeckId: "d-newer", sourceDeckName: "Newer Deck" },
      { oracleId: "o1", sourceDeckId: "d-older", sourceDeckName: "Older Deck" },
    ]);
    expect(result.get("o1")).toEqual({ sourceDeckId: "d-newer", sourceDeckName: "Newer Deck" });
  });

  it("selects independently per card in a batch", () => {
    const result = newestPerCard([
      { oracleId: "o1", sourceDeckId: "d-a", sourceDeckName: "Deck A" },
      { oracleId: "o2", sourceDeckId: "d-b", sourceDeckName: "Deck B" },
      { oracleId: "o1", sourceDeckId: "d-c", sourceDeckName: "Deck C" },
    ]);
    expect(result.get("o1")).toEqual({ sourceDeckId: "d-a", sourceDeckName: "Deck A" });
    expect(result.get("o2")).toEqual({ sourceDeckId: "d-b", sourceDeckName: "Deck B" });
  });

  it("is empty for no rows", () => {
    expect(newestPerCard([])).toEqual(new Map());
  });
});

// Round-9 finding: every newestPerCard test above supplies rows already in newest-first order,
// so nothing caught the actual database query's own ordering being dropped, flipped, or pointed
// at the wrong column — the pure-reduction tests would stay green while the label silently
// named an arbitrary or older source.
describe("latestReleaseSourcesQuery", () => {
  it("orders by created_at DESC, and filters on userId, askingDeckId and the oracle id list", () => {
    const { sql: text, params } = latestReleaseSourcesQuery("u1", "d2", ["o1", "o2"]).toSQL();
    expect(text).toMatch(/order by\s+"pull_releases"\."created_at"\s+desc/i);
    expect(text).toMatch(/"pull_releases"\."user_id"\s*=/i);
    expect(text).toMatch(/"pull_releases"\."asking_deck_id"\s*=/i);
    expect(text).toMatch(/"pull_releases"\."oracle_id"\s+in\b/i);
    expect(params).toEqual(["u1", "d2", "o1", "o2"]);
  });
});
