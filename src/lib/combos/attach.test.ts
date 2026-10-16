import { describe, expect, it } from "vitest";
import { comboFor, comboLookupIds, deckComboFields } from "./attach";
import type { ComboPartner } from "./near-miss";

const partner = (over: Partial<ComboPartner> = {}): ComboPartner => ({
  oracleId: "c-1",
  partnerOracleId: "p-1",
  partnerName: "Isochron Scepter",
  popularity: 100,
  variantId: "v-1",
  ...over,
});

describe("comboLookupIds", () => {
  // BOTH LISTS, and the suggestions half is the one a deletion leaves green: every component
  // test injects `comboPartner` into its own fixture, so dropping the suggestions from this
  // union costs the Consider tile its clause and nothing fails.
  it("asks about the candidates AND the suggestions", () => {
    const ids = comboLookupIds([{ oracleId: "cand-1" }], [{ oracleId: "sugg-1" }]);
    expect(ids).toContain("cand-1");
    expect(ids).toContain("sugg-1");
  });

  // ONE READ, so an id in both rankings — which most are, since they rank the same
  // commander's pool — is asked about once.
  it("asks about an id in both lists only once", () => {
    const ids = comboLookupIds([{ oracleId: "both" }], [{ oracleId: "both" }]);
    expect(ids).toEqual(["both"]);
  });

  it("copes with either list being empty", () => {
    expect(comboLookupIds([], [{ oracleId: "s" }])).toEqual(["s"]);
    expect(comboLookupIds([{ oracleId: "c" }], [])).toEqual(["c"]);
    expect(comboLookupIds([], [])).toEqual([]);
  });
});

describe("comboFor", () => {
  it("shapes a hit into the partner the payload carries", () => {
    const map = new Map([["c-1", partner()]]);
    expect(comboFor("c-1", map)).toEqual({ oracleId: "p-1", name: "Isochron Scepter" });
  });

  // NULL, NOT UNDEFINED, and never an omitted field: both consumers declare it, so
  // present-and-null is the honest "asked, and there is none" where an absent field is
  // indistinguishable from a payload that never asked.
  it("answers null for a card with no combo", () => {
    expect(comboFor("c-2", new Map([["c-1", partner()]]))).toBeNull();
  });

  // THE READ IS SWALLOWED on the page, so a failure arrives here as null — and every row
  // must then simply carry no clause rather than throwing on the way to being drawn.
  it("answers null when the read failed entirely", () => {
    expect(comboFor("c-1", null)).toBeNull();
  });
});

describe("deckComboFields", () => {
  it("names the in-deck partner and carries the others it does not name", () => {
    const map = new Map([["c-1", partner({ otherPartners: 2 })]]);
    expect(deckComboFields("c-1", map)).toEqual({
      comboPartner: { oracleId: "p-1", name: "Isochron Scepter" },
      comboOtherPartners: 2,
    });
  });

  it("ships no count for a lone partner", () => {
    const map = new Map([["c-1", partner({ otherPartners: 0 })]]);
    expect(deckComboFields("c-1", map)).toEqual({
      comboPartner: { oracleId: "p-1", name: "Isochron Scepter" },
    });
  });

  // A failed read is null, and draws what a card with no combo draws.
  it("is a present null for a card with no partner, or a failed read", () => {
    expect(deckComboFields("c-2", new Map([["c-1", partner()]]))).toEqual({ comboPartner: null });
    expect(deckComboFields("c-1", null)).toEqual({ comboPartner: null });
  });
});
