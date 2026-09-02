import { describe, expect, it } from "vitest";
import { frontFaceName, frontFaceOracle, frontFaceTypeLine } from "./faces";

describe("frontFaceTypeLine", () => {
  it("splits a joined type line on the ' // ' separator Scryfall uses", () => {
    expect(frontFaceTypeLine("Land // Legendary Creature — Demon")).toBe("Land");
  });
  it("returns a single-faced type line unchanged", () => {
    expect(frontFaceTypeLine("Legendary Creature — Zombie Wizard")).toBe(
      "Legendary Creature — Zombie Wizard",
    );
  });
});

describe("frontFaceName", () => {
  it("splits a joined name on ' // '", () => {
    expect(frontFaceName("Adorned Pouncer // Horse")).toBe("Adorned Pouncer");
  });
});

describe("frontFaceOracle", () => {
  // transform.ts joins oracle text with "\n//\n", NOT " // ". Splitting oracle
  // text on " // " returns the whole joined string, so a back face's abilities
  // read as the front's — the #79 bug class.
  it("splits joined oracle text on the '\\n//\\n' separator", () => {
    expect(frontFaceOracle("Front ability.\n//\n{T}: Back ability.")).toBe("Front ability.");
  });
  it("does not split on the type-line separator", () => {
    expect(frontFaceOracle("Deals 2 damage // not a face break")).toBe(
      "Deals 2 damage // not a face break",
    );
  });
  it("returns an empty string for null oracle text", () => {
    expect(frontFaceOracle(null)).toBe("");
  });
});
