import { describe, expect, it } from "vitest";

import { commanderRankingsKey } from "./rankings";
import { discoveryKey } from "../discovery/list";

// BOTH CACHE VERSIONS, PINNED TOGETHER, and that pairing is the whole point.
//
// The two payloads are cached under separate constants in separate modules and
// are dropped independently, which `rankings.ts` itself calls "the state nobody
// thinks to check" — a release that changes the row's shape and bumps one leaves
// warm entries of the other decoding into items with no sentence, no gap slot
// and no headline figure.
//
// Nothing else asserts the owned lane's version. `discoveryKey` had its literal
// pinned in `discovery/list.test.ts` and `commanderRankingsKey` had nothing, so
// reverting that half would have failed no test — found by the pre-open review.
// Asserting the pair in one case means a reader editing either sees both lines
// and has to decide about both.
//
// This is a CHANGE DETECTOR on purpose, of the same kind as `about.test.ts`'s
// content hash: there is no invariant relating 4 to 6, and the value of the case
// is that a bump cannot be incidental.
describe("the list caches' payload versions", () => {
  it("pins both, so a pair bumped half-way fails", () => {
    expect(commanderRankingsKey).toEqual(["commander-rankings", "v6"]);
    expect(discoveryKey("fit")).toEqual(["discovery", "fit", "v4"]);
  });

  // The sort rides in the key beside the version, so two sorts cannot share an
  // entry — a property of the key's shape rather than of either number.
  it("keeps the two discovery sorts apart at the same version", () => {
    expect(discoveryKey("new")).not.toEqual(discoveryKey("fit"));
    expect(discoveryKey("new")).toContain("v4");
  });
});
