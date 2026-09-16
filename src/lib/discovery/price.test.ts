import { describe, expect, it } from "vitest";
import { pricesOrEmpty, slotFor } from "./price";

describe("slotFor", () => {
  it("row 1/2 — a live priced printing prints the figure", () => {
    expect(slotFor({ oracleId: "a", liveCents: 349, everPriced: true, live: true }))
      .toEqual({ kind: "priced", cents: 349 });
    expect(slotFor({ oracleId: "a", liveCents: 12900, everPriced: true, live: true }))
      .toEqual({ kind: "priced", cents: 12900 });
  });

  it("row 3 — priced before, not at the newest as_of, reads not stocked", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: true, live: false }))
      .toEqual({ kind: "notStocked" });
  });

  // The printing is in this run's feed with no non-foil figure. It has not sold
  // out, so the slot says nothing rather than claiming it is unstocked.
  it("row 6 — live but priceless leaves the slot absent", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: true, live: true }))
      .toEqual({ kind: "absent" });
  });

  it("row 4 — never priced leaves the slot absent", () => {
    expect(slotFor({ oracleId: "a", liveCents: null, everPriced: false, live: false }))
      .toEqual({ kind: "absent" });
    expect(slotFor(undefined)).toEqual({ kind: "absent" });
  });

  // Row 5 of the matrix — an owned commander, priced at nothing — has no test
  // here any more because it has no case: discover lists only commanders the
  // player does not own, so the guarantee moved to the query and is pinned by
  // `discoverCandidates` in candidates.test.ts.

  it("never reads a zero as free", () => {
    expect(slotFor({ oracleId: "a", liveCents: 0, everPriced: true, live: true }))
      .toEqual({ kind: "priced", cents: 0 });
  });
});

// THE CATCH IS THE WHOLE POINT OF THE WRAPPER, and nothing exercised it: the
// route tests mock the wrapper itself, so removing the catch left every suite
// green while a transient price failure rejected the route's `Promise.all` and
// took `/commanders` and `/discover` down whole. Named by review.
//
// `loadPrices` is mocked here rather than called, because what is under test is
// the boundary's behaviour on a rejection and not the query.
describe("pricesOrEmpty", () => {
  it("returns an empty map when the price read rejects", async () => {
    const reject = () => Promise.reject(new Error("feed down"));

    await expect(pricesOrEmpty(["a"], reject)).resolves.toEqual(new Map());
  });

  // The other half, and not a formality: a wrapper that swallowed EVERYTHING
  // would pass the case above while returning nothing on a healthy read.
  it("passes the rows through when the read succeeds", async () => {
    const rows = new Map([["a", { oracleId: "a", liveCents: 100, everPriced: true, live: true }]]);

    await expect(pricesOrEmpty(["a"], async () => rows)).resolves.toBe(rows);
  });

  it("hands the ids it was given to the read", async () => {
    const seen: string[][] = [];

    await pricesOrEmpty(["a", "b"], async (ids) => { seen.push(ids); return new Map(); });

    expect(seen).toEqual([["a", "b"]]);
  });
});
