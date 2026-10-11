import { describe, expect, it } from "vitest";

import { checkedSynopsis } from "../../components/decks/__fixtures__/synopsis";
import { allEvidenceIds, basedOnIds } from "./based-on";

const evidence = { strategy: [["a"]], keep: [["b", "b"]], sendBack: [[]], tips: [["a", "c"]], keyCards: [["a", "d"]], weaknesses: [["e"]] };

describe("basedOnIds", () => {
  it("is the evidence aligned with the claim, once each", () => {
    const c = checkedSynopsis({ evidence });
    expect(basedOnIds(c, "tips", 0)).toEqual(["a", "c"]);
    expect(basedOnIds(c, "keep", 0)).toEqual(["b"]);
  });
  it("leaves out a Key card's own card", () => {
    expect(basedOnIds(checkedSynopsis({ evidence }), "keyCards", 0, "a")).toEqual(["d"]);
  });
  it("is empty for an overview with no evidence, a claim with none, or an index past the end", () => {
    expect(basedOnIds(checkedSynopsis(), "tips", 0)).toEqual([]);
    expect(basedOnIds(checkedSynopsis({ evidence }), "sendBack", 0)).toEqual([]);
    expect(basedOnIds(checkedSynopsis({ evidence }), "tips", 5)).toEqual([]);
  });
});

describe("allEvidenceIds", () => {
  it("lists every cited card once", () => {
    expect(allEvidenceIds(checkedSynopsis({ evidence })).sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(allEvidenceIds(checkedSynopsis())).toEqual([]);
  });
});
