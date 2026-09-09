import { describe, it, expect } from "vitest";
import { colorLabel, deckIdentity } from "./format";

describe("deckIdentity", () => {
  it("orders a lone primary WUBRG, so its pips match a pair's", () => {
    expect(deckIdentity(["R", "W"], null)).toEqual(["W", "R"]);
    expect(deckIdentity(["W", "X"], null)).toEqual(["W", "X"]);
  });

  it("unions a pair and orders the union WUBRG", () => {
    // Jeskai primary, Boros partner: the naive concatenation puts the partner's
    // red after white, and `IdentityPips` draws the array as given.
    expect(deckIdentity(["W", "U", "R"], ["R", "W"])).toEqual(["W", "U", "R"]);
    expect(deckIdentity(["G"], ["B", "W"])).toEqual(["W", "B", "G"]);
  });

  it("drops the duplicate a shared colour would otherwise repeat", () => {
    expect(deckIdentity(["W", "U"], ["U", "B"])).toEqual(["W", "U", "B"]);
  });

  it("keeps an unrecognised letter rather than dropping it", () => {
    // `colorLabel` refuses to name an identity it does not recognise, so losing
    // the letter here would hand it a combination the deck does not have.
    expect(deckIdentity(["W", "X"], ["U"])).toEqual(["W", "U", "X"]);
  });

  it("carries a colorless pair through as colorless", () => {
    expect(deckIdentity([], [])).toEqual([]);
  });
});

describe("colorLabel", () => {
  it("names the single colors", () => {
    expect(["W", "U", "B", "R", "G"].map((c) => colorLabel([c]))).toEqual([
      "White", "Blue", "Black", "Red", "Green",
    ]);
  });

  it("names colorless and five-color", () => {
    expect(colorLabel([])).toBe("Colorless");
    expect(colorLabel(["W", "U", "B", "R", "G"])).toBe("5-color");
  });

  // Every entry, not a sample: a typo in an untested mapping is exactly the kind
  // of thing that reaches a user, since each one shows on one commander's page.
  const GUILDS: [string, string, string][] = [
    ["W", "U", "Azorius"], ["U", "B", "Dimir"], ["B", "R", "Rakdos"],
    ["R", "G", "Gruul"], ["G", "W", "Selesnya"], ["W", "B", "Orzhov"],
    ["U", "R", "Izzet"], ["B", "G", "Golgari"], ["R", "W", "Boros"],
    ["G", "U", "Simic"],
  ];
  it.each(GUILDS)("names %s%s as %s, in either order", (a, b, name) => {
    expect(colorLabel([a, b])).toBe(name);
    expect(colorLabel([b, a])).toBe(name);
  });

  const TRIOMES: [string[], string][] = [
    [["G", "U", "W"], "Bant"], [["W", "U", "B"], "Esper"], [["U", "B", "R"], "Grixis"],
    [["B", "R", "G"], "Jund"], [["R", "G", "W"], "Naya"], [["W", "B", "G"], "Abzan"],
    [["U", "R", "W"], "Jeskai"], [["B", "G", "U"], "Sultai"], [["R", "W", "B"], "Mardu"],
    [["G", "U", "R"], "Temur"],
  ];
  it.each(TRIOMES)("names %j as %s instead of falling back to Multi", (identity, name) => {
    expect(colorLabel(identity)).toBe(name);
    expect(colorLabel(identity.slice().reverse())).toBe(name);
  });

  it("names a four-color identity by the color it is missing", () => {
    expect(colorLabel(["W", "U", "B", "R"])).toBe("Non-green");
    expect(colorLabel(["U", "B", "R", "G"])).toBe("Non-white");
    expect(colorLabel(["W", "B", "R", "G"])).toBe("Non-blue");
    expect(colorLabel(["W", "U", "R", "G"])).toBe("Non-black");
    expect(colorLabel(["W", "U", "B", "G"])).toBe("Non-red");
  });

  it("falls back to the raw letter for a lone unknown color code", () => {
    expect(colorLabel(["X"])).toBe("X");
  });

  // Plain map indexing reaches the Object prototype, which would return a
  // function where the signature promises a string.
  it("does not treat inherited object keys as color codes", () => {
    expect(colorLabel(["toString"])).toBe("toString");
    expect(colorLabel(["W", "constructor"])).toBe("Multi");
    expect(colorLabel(["valueOf", "hasOwnProperty"])).toBe("Multi");
  });

  it("falls back to Multi when any code in a combination is unknown", () => {
    // Without the guard this reads "Non-red", naming a combination the card
    // does not have.
    expect(colorLabel(["W", "U", "B", "X"])).toBe("Multi");
    expect(colorLabel(["W", "X"])).toBe("Multi");
    expect(colorLabel(["W", "U", "X"])).toBe("Multi");
    expect(colorLabel(["W", "U", "B", "R", "X"])).toBe("Multi");
  });

  // A duplicate-bearing identity is longer than 5 with every code known, which
  // used to reach the four-color branch's non-null assertion and throw.
  it("does not name a duplicate-bearing identity", () => {
    // Four distinct colors wearing a fifth slot — "5-color" would be a lie.
    expect(colorLabel(["W", "U", "B", "R", "R"])).toBe("Multi");
    expect(colorLabel(["W", "W", "U", "U", "B", "B"])).toBe("Multi");
    expect(colorLabel(["W", "W"])).toBe("Multi");
  });
});
