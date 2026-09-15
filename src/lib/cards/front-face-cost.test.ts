// An `adventure`, `split` or `prepare` card prints two faces on one piece of
// card stock, and Scryfall's top-level `mana_cost` is both halves joined:
// `Gollum, Silent Slinker // Meager Meal` is `{3}{B} // {B}`. A pip run has no
// way to say `//`, so the row drew four pips for a four-mana creature.
import { describe, expect, it } from "vitest";
import { faceCosts, frontFaceCost } from "./faces";
import { parseManaCost } from "../../components/ui/cost-pips";
import { spokenFullManaCost, spokenManaCost } from "../copy/card-surfaces";

describe("frontFaceCost", () => {
  it("keeps a single-faced cost whole", () => {
    expect(frontFaceCost("{2}{U}{B}")).toBe("{2}{U}{B}");
  });

  it("takes the front half of a joined cost", () => {
    expect(frontFaceCost("{3}{B} // {B}")).toBe("{3}{B}");
  });

  it("is empty for a face with no cost, rather than borrowing the other's", () => {
    // A modal DFC land // spell is not this shape — Scryfall omits the top-level
    // cost there — but a costless front half must never inherit the back's pips.
    expect(frontFaceCost(" // {B}")).toBe("");
  });
});

describe("what the pips and their label draw for a joined cost", () => {
  it("draws the front face's symbols only", () => {
    expect(parseManaCost("{3}{B} // {B}")).toEqual(["3", "B"]);
  });

  it("speaks the same half the pips draw", () => {
    expect(spokenManaCost("{3}{B} // {B}")).toBe(spokenManaCost("{3}{B}"));
  });
});

describe("faceCosts", () => {
  it("is one entry for an ordinary cost", () => {
    expect(faceCosts("{2}{U}{B}")).toEqual(["{2}{U}{B}"]);
  });

  it("is both halves of a split cost, in printed order", () => {
    expect(faceCosts("{G/U}{G/U} // {1}{G}{U}")).toEqual(["{G/U}{G/U}", "{1}{G}{U}"]);
  });

  // A costless half is dropped rather than returned empty: it would otherwise
  // draw a separator with no run after it.
  it("drops an empty half", () => {
    expect(faceCosts(" // {B}")).toEqual(["{B}"]);
    expect(faceCosts("{B} // ")).toEqual(["{B}"]);
  });

  it("is empty for a card with no cost at all", () => {
    expect(faceCosts(null)).toEqual([]);
    expect(faceCosts("")).toEqual([]);
  });
});

describe("the two labels, and why there are two", () => {
  // The rule both follow: a label describes the run beside it. The modal draws
  // both halves, so it speaks both; a row draws one, so it speaks one.
  // "second cost" rather than "or": a hybrid already speaks as "green or blue",
  // so an "or" between the halves would be the third one in the sentence and
  // the only one dividing two costs.
  it("speaks both halves for the modal, naming the second as its own cost", () => {
    expect(spokenFullManaCost("{G/U}{G/U} // {1}{G}{U}")).toBe(
      "mana cost green or blue green or blue, second cost 1 green blue",
    );
  });

  it("speaks only the front half for a row", () => {
    expect(spokenManaCost("{G/U}{G/U} // {1}{G}{U}")).toBe(
      "mana cost green or blue green or blue",
    );
  });

  it("reads identically through both for a card with one cost", () => {
    expect(spokenFullManaCost("{3}{W}")).toBe(spokenManaCost("{3}{W}"));
  });

  it("says no mana cost through both for a land", () => {
    expect(spokenFullManaCost(null)).toBe(spokenManaCost(null));
    expect(spokenFullManaCost("")).toBe("no mana cost");
  });
});
