import { describe, expect, it } from "vitest";
import { shapeCandidate, type CandidateSqlRow } from "./candidates";

const row = (over: Partial<CandidateSqlRow>): CandidateSqlRow => ({
  oracleId: "a", name: "Atraxa",
  colorIdentity: ["W", "U", "B", "G"], imageUri: null,
  edhrecTotal: 99, tags: [{ slug: "counters", label: "Counters", count: 5 }],
  ownedSupport: 40, ...over,
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
