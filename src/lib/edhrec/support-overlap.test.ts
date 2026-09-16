import { describe, expect, it } from "vitest";
import { supportOverlap, type SupportList } from "./support-overlap";

const list = (oracleIds: string[], total = oracleIds.length): SupportList => ({
  total,
  oracleIds,
});
const pool = (...ids: string[]) => ids.map((id) => ({ oracleId: id, name: `card-${id}` }));

describe("supportOverlap", () => {
  it("returns the pool cards the support list names, with their names", () => {
    const got = supportOverlap(list(["a", "c"]), pool("a", "b", "c"));
    expect(got.oracleIds).toEqual(["a", "c"]);
    expect(got.names).toEqual(["card-a", "card-c"]);
  });

  it("is ordered by the POOL, not by the support list", () => {
    const got = supportOverlap(list(["c", "a"]), pool("a", "b", "c"));
    expect(got.oracleIds).toEqual(["a", "c"]);
  });

  // The pool is `commanderPool`'s output, so the identity restriction and the
  // commander's own card are already applied — and that restriction is part of
  // the figure. `probe:fit-parity` found `Faceless One`, a colourless commander
  // whose stored list holds 83 off-identity cards of 322: 122 owned against 96
  // playable. Fit measures what can be played, so the pool decides.
  it("counts nothing the pool excludes, however the support list is shaped", () => {
    const got = supportOverlap(list(["a", "off-identity", "the-commander"]), pool("a"));
    expect(got.oracleIds).toEqual(["a"]);
  });

  // A name the catalog could not resolve is absent from `oracleIds` but still
  // counted in `total` — `index-build.ts:95-97`'s deliberate asymmetry, so a
  // missing name reduces measured overlap rather than shrinking the
  // denominator. The overlap must not try to make up the difference.
  it("ignores a total larger than the ids it holds", () => {
    const support = list(["a"], 250);
    const got = supportOverlap(support, pool("a", "b"));
    expect(got.oracleIds).toEqual(["a"]);
    expect(support.total).toBe(250);
  });

  it("handles an empty support list and an empty pool", () => {
    expect(supportOverlap(list([]), pool("a"))).toEqual({ names: [], oracleIds: [] });
    expect(supportOverlap(list(["a"]), [])).toEqual({ names: [], oracleIds: [] });
  });

  // No name matching of any kind: the index resolved every name to an id when
  // it was built, which is what makes this side the stable one. A pool card
  // whose NAME appears in the list but whose id does not is not an overlap.
  it("matches on oracle id and never on name", () => {
    const got = supportOverlap(list(["card-a"]), pool("a"));
    expect(got.oracleIds).toEqual([]);
  });

  it("does not double-count a support id the pool holds once", () => {
    const got = supportOverlap(list(["a", "a"]), pool("a"));
    expect(got.oracleIds).toEqual(["a"]);
  });
});
