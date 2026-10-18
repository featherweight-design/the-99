import { describe, expect, it } from "vitest";

import { cardDescription, cutAtWord, DESCRIPTION_MAX, frontCostSymbols, previewTypeLine } from "./preview";

const rootha = {
  faces: [{ name: "Rootha, Mastering the Moment", typeLine: "Legendary Creature — Orc Sorcerer" }],
  typeLine: "Legendary Creature — Orc Sorcerer",
  oracleText:
    "At the beginning of combat on your turn, if you've cast an instant or sorcery spell this turn, create an X/X blue and red Elemental creature token with flying and haste, where X is the greatest mana value among instant and sorcery spells you've cast this turn.",
};

describe("the card's link-preview description (C2)", () => {
  it("is the type line, then the rules text cut at a word, as the board draws Rootha's", () => {
    const d = cardDescription(rootha);
    expect(d.startsWith("Legendary Creature — Orc Sorcerer. At the beginning of combat on your turn,")).toBe(true);
    expect(d.endsWith("…")).toBe(true);
    expect(d.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    // Cut at a word: what precedes the ellipsis is a whole word of the text.
    const head = d.slice(0, -1);
    expect(`${rootha.typeLine}. ${rootha.oracleText}`.startsWith(head)).toBe(true);
    expect(`${rootha.typeLine}. ${rootha.oracleText}`.charAt(head.length)).toBe(" ");
  });

  it("keeps a short card whole, with no ellipsis", () => {
    expect(cardDescription({ faces: [{ name: "Sol Ring", typeLine: "Artifact" }], typeLine: "Artifact", oracleText: "{T}: Add {C}{C}." })).toBe(
      "Artifact. {T}: Add {C}{C}.",
    );
  });

  it("joins both faces' type lines and text with ` // `, and turns line breaks into spaces", () => {
    const valki = {
      faces: [{ name: "Valki, God of Lies", typeLine: "Legendary Creature — God" }, { name: "Tibalt, Cosmic Impostor", typeLine: "Legendary Planeswalker — Tibalt" }],
      typeLine: "Legendary Creature — God // Legendary Planeswalker — Tibalt",
      oracleText: "Each opponent reveals.\n{X}: Copy.\n//\n+2: Exile.",
    };
    expect(cardDescription(valki)).toBe("Legendary Creature — God // Legendary Planeswalker — Tibalt. Each opponent reveals. {X}: Copy. // +2: Exile.");
  });

  it("is the type line alone for a card with no text", () => {
    expect(cardDescription({ faces: [{ name: "Forest", typeLine: "Basic Land — Forest" }], typeLine: "Basic Land — Forest", oracleText: null })).toBe("Basic Land — Forest");
  });

  it("cuts a single over-long word mid-word rather than dropping it, and drops trailing punctuation before the ellipsis", () => {
    expect(cutAtWord("x".repeat(200), 10)).toBe(`${"x".repeat(9)}…`);
    expect(cutAtWord("one two, three four", 10)).toBe("one two…");
    // A word ending at the last character before the ellipsis still fits.
    expect(cutAtWord("aaaa bbbb cccc", 10)).toBe("aaaa bbbb…");
  });
});

describe("the preview's cost and type", () => {
  it("draws the front face's cost only", () => {
    expect(frontCostSymbols("{2}{U}{R}")).toEqual(["2", "U", "R"]);
    expect(frontCostSymbols("{1}{B} // {5}{B}{R}")).toEqual(["1", "B"]);
    expect(frontCostSymbols("{W/U}{G/P}")).toEqual(["W/U", "G/P"]);
    expect(frontCostSymbols(null)).toEqual([]);
    expect(frontCostSymbols("")).toEqual([]);
  });

  it("falls back to the card's type line when it has no faces", () => {
    expect(previewTypeLine({ faces: [], typeLine: "Artifact" })).toBe("Artifact");
  });
});
