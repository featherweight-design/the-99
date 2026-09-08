import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { commanderSupport } from "../../db/schema";
import { discoverCandidates, shapeCandidate, type CandidateSqlRow } from "./candidates";

const row = (over: Partial<CandidateSqlRow>): CandidateSqlRow => ({
  oracleId: "a", name: "Atraxa",
  colorIdentity: ["W", "U", "B", "G"], imageUri: null, artCropUri: null, releasedAt: "2021-02-05",
  edhrecTotal: 99, deckCount: 1209, tags: [{ slug: "counters", label: "Counters", count: 5 }],
  ownedSupport: 40, collectionSupport: 40, ...over,
});

// Thin by design: `shapeCandidate` is a spread, so these pin the contract rather
// than an algorithm. Each is a regression guard against a later `?? 0` or `?? []`
// — the defaults that would erase the difference between "EDHREC does not index
// this commander" and "the index says zero". The query itself is checked by hand
// against the real database, not here.
describe("shapeCandidate", () => {
  it("carries overlap, denominator and the two zero-vs-absent cases through", () => {
    const got = shapeCandidate(row({}));
    expect(got.ownedSupport).toBe(40);
    expect(got.edhrecTotal).toBe(99);

    expect(shapeCandidate(row({ edhrecTotal: null })).edhrecTotal).toBeNull();

    const untagged = shapeCandidate(row({ tags: [] }));
    const noOverlap = shapeCandidate(row({ ownedSupport: 0 }));
    expect(untagged.tags).toEqual([]);
    expect(untagged.ownedSupport).toBe(40);
    expect(noOverlap.ownedSupport).toBe(0);
    expect(noOverlap.tags).toHaveLength(1);
  });
});

// Read off the emitted SQL rather than off returned rows: `loadCandidates`
// needs a database, and the assertion that matters here is structural — that
// the ownership exclusion reaches the WHERE, and that a player who owns nothing
// does not get a `NOT IN ()`. What the exclusion then removes is checked by
// hand against the real database, like the rest of this query.
describe("discoverCandidates", () => {
  const emitted = (collectionOracleIds: string[]) =>
    db
      .select({ oracleId: commanderSupport.commanderOracleId })
      .from(commanderSupport)
      .where(discoverCandidates("user_1", collectionOracleIds))
      .toSQL();

  it("excludes every commander the player owns", () => {
    const q = emitted(["owned_a", "other"]);
    expect(q.sql).toContain("<> all(");
    expect(q.params).toContainEqual(["owned_a", "other"]);
  });

  it("asks nothing of an empty collection rather than emitting NOT IN ()", () => {
    const q = emitted([]);
    expect(q.sql).toContain("<> all(");
    expect(q.sql).not.toContain("in ()");
    expect(q.params).toContainEqual([]);
  });
});
