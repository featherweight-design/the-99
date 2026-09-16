// @vitest-environment node
//
// The browser half of `probe-nav-cost.mjs` needs a production server and a
// signed-in session; these are the decisions it makes about the numbers it
// brings back, which are pure and testable here.
import { describe, expect, it } from "vitest";
import { assertNoBudgetDrift, classify, compareToBudget, summarise } from "./probe-nav-cost.mjs";

const req = (headers: Record<string, string>, resourceType = "fetch") => ({
  headers: () => headers,
  resourceType: () => resourceType,
});

describe("classify", () => {
  it("counts a navigation payload as rsc", () => {
    expect(classify(req({ rsc: "1" }))).toBe("rsc");
  });

  // The split the 0-fetch budget rests on. A prefetch folded into `rsc` makes a
  // converted route look unconverted, and an unconverted one look worse.
  it("does not count a speculative prefetch as a navigation fetch", () => {
    expect(classify(req({ rsc: "1", "next-router-prefetch": "1" }))).toBe("prefetch");
  });

  it("counts a server action separately", () => {
    expect(classify(req({ "next-action": "abc" }))).toBe("action");
  });

  it("ignores a request that is neither", () => {
    expect(classify(req({}, "image"))).toBe(null);
  });
});

describe("compareToBudget", () => {
  it("fails a route costing more fetches than its budget", () => {
    const r = compareToBudget(
      { route: "/decks", rsc: 1, decodedKB: 28.3, document: 0 },
      { rsc: 0, decodedKB: 28.3 },
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("budget 0");
  });

  // Baseline mode: PR 1 changes no behavior, so the probe it introduces has to
  // pass against an app that still fetches once per revisit.
  it("passes a route still at its recorded baseline", () => {
    const r = compareToBudget(
      { route: "/decks", rsc: 1, decodedKB: 28.3, document: 0 },
      { rsc: 1, decodedKB: 28.3 },
    );
    expect(r.ok).toBe(true);
  });

  it("fails a payload over its ceiling by more than the tolerance", () => {
    const r = compareToBudget(
      { route: "/collection", rsc: 1, decodedKB: 1700, document: 0 },
      { rsc: 1, decodedKB: 1595.8 },
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("over ceiling");
  });

  it("allows jitter within the tolerance", () => {
    const r = compareToBudget(
      { route: "/collection", rsc: 1, decodedKB: 1600, document: 0 },
      { rsc: 1, decodedKB: 1595.8 },
    );
    expect(r.ok).toBe(true);
  });

  // The instrumentation-failure shape: a lost measurement reports 0 KB, and a
  // ceiling test alone waves it through because 0 is under every ceiling.
  it("fails a zero payload against a ceiling that expects bytes", () => {
    const r = compareToBudget(
      { route: "/collection", rsc: 1, decodedKB: 0, document: 0 },
      { rsc: 1, decodedKB: 1595.8 },
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("no bytes");
  });

  // The guard above fired on SUCCESS before this case existed: a converted route
  // reports 0 fetches and therefore 0 bytes, while its ceiling stays positive.
  it("passes a converted route reporting no fetches and no bytes", () => {
    const r = compareToBudget(
      { route: "/collection", rsc: 0, decodedKB: 0, document: 0 },
      { rsc: 0, decodedKB: 1595.8 },
    );
    expect(r.ok).toBe(true);
  });

  // A hard reload reports rsc 0, which is exactly what a converted route's
  // budget expects — so without this the worst regression available (the router
  // falling back to a full page load) passes as success.
  it("fails a navigation that fell back to a document load", () => {
    const r = compareToBudget(
      { route: "/collection", rsc: 0, decodedKB: 0, document: 1 },
      { rsc: 0, decodedKB: 1595.8 },
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("document load");
  });

  it("ignores a ceiling that was never measured", () => {
    const r = compareToBudget(
      { route: "/collection", rsc: 1, decodedKB: 9999, document: 0 },
      { rsc: 1, decodedKB: null },
    );
    expect(r.ok).toBe(true);
  });
});

describe("summarise", () => {
  // A first visit legitimately fetches. The claim under test is about the
  // second and third, so only steps marked as revisits become budget rows.
  // The non-revisit row comes LAST and names the same route, so dropping the
  // `revisit` filter lets it overwrite the figure this is meant to keep. An
  // earlier version of this test put `route: null` on that row, which the route
  // check excluded on its own — so it passed with the filter removed and proved
  // nothing.
  it("keeps the revisit figure and ignores a first visit to the same route", () => {
    const rows = summarise([
      { landed: "/collection", route: "/collection", revisit: true, rsc: 1, decodedKB: 1595.8, responseMs: 290, document: 0 },
      { landed: "/collection", route: "/collection", revisit: false, rsc: 1, decodedKB: 1595.8, responseMs: 900, document: 0 },
    ]);
    expect(rows["/collection"]).toEqual({ rsc: 1, decodedKB: 1595.8, responseMs: 290, document: 0 });
  });

  // What the run-level completeness check rests on: a route the walk only ever
  // visited once produces no budget row at all, rather than a first-visit figure
  // masquerading as a revisit.
  it("produces no row for a route that was never revisited", () => {
    const rows = summarise([
      { landed: "/discover", route: "/discover", revisit: false, rsc: 1, decodedKB: 951.3, responseMs: 80, document: 0 },
    ]);
    expect(rows["/discover"]).toBeUndefined();
  });

  it("takes the last revisit when a route is visited more than twice", () => {
    const rows = summarise([
      { route: "/decks", revisit: true, rsc: 1, decodedKB: 28.3, responseMs: 512, document: 0 },
      { route: "/decks", revisit: true, rsc: 1, decodedKB: 28.3, responseMs: 345, document: 0 },
    ]);
    expect(rows["/decks"].responseMs).toBe(345);
  });
});

describe("assertNoBudgetDrift", () => {
  const walked = ["/collection", "/decks"];

  it("passes when the walk and the baseline name the same routes", () => {
    expect(assertNoBudgetDrift(walked, ["/decks", "/collection"]).ok).toBe(true);
  });

  // The failure this exists for: a later conversion adds a route to the baseline
  // and the walk never measures it, so its budget is never enforced.
  it("fails a budget the walk never measures", () => {
    const r = assertNoBudgetDrift(walked, ["/collection", "/decks", "/discover"]);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("/discover");
  });

  it("fails a measured route with no budget", () => {
    const r = assertNoBudgetDrift(walked, ["/collection"]);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("/decks");
  });
});
