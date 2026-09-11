// An `adventure`, `split` or `prepare` card prints two faces on one piece of
// card stock, and Scryfall's top-level `mana_cost` is both halves joined:
// `Gollum, Silent Slinker // Meager Meal` is `{3}{B} // {B}`. A pip run has no
// way to say `//`, so the row drew four pips for a four-mana creature.
import { describe, expect, it } from "vitest";
import { frontFaceCost } from "./faces";
import { parseManaCost } from "../../components/ui/cost-pips";
import { spokenManaCost } from "../copy/card-surfaces";

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
