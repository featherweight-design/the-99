import { describe, expect, it } from "vitest";
import {
  buildDecklistText,
  buildShoppingText,
  decklistFilename,
  shoppingFilename,
} from "./export-helpers";

describe("buildDecklistText", () => {
  it("has commander as first line with '1 '", () => {
    const out = buildDecklistText({
      commanderName: "Muldrotha, the Gravetide",
      cards: [],
    });
    expect(out.split("\n")[0]).toBe("1 Muldrotha, the Gravetide");
  });

  it("includes body cards with quantities after the commander", () => {
    const out = buildDecklistText({
      commanderName: "Muldrotha, the Gravetide",
      cards: [
        { name: "Sol Ring", quantity: 1 },
        { name: "Forest", quantity: 5 },
      ],
    });
    const lines = out.split("\n");
    expect(lines[1]).toBe("1 Sol Ring");
    expect(lines[2]).toBe("5 Forest");
  });

  it("contains no comment header or separator lines", () => {
    const out = buildDecklistText({
      commanderName: "Muldrotha, the Gravetide",
      cards: [{ name: "Sol Ring", quantity: 1 }],
    });
    expect(out).not.toMatch(/^#|^\/\//m);
  });

  it("is just the commander line when cards is empty (no trailing newline)", () => {
    const out = buildDecklistText({
      commanderName: "Muldrotha, the Gravetide",
      cards: [],
    });
    expect(out).toBe("1 Muldrotha, the Gravetide");
  });

  it("produces consistent text for copy and download (same string)", () => {
    const args = {
      commanderName: "Muldrotha, the Gravetide",
      cards: [{ name: "Gravecrawler", quantity: 1 }],
    };
    expect(buildDecklistText(args)).toBe(buildDecklistText(args));
  });
});

describe("buildShoppingText", () => {
  it("returns names only, one per line", () => {
    expect(buildShoppingText([{ name: "Rhystic Study" }, { name: "Sol Ring" }]))
      .toBe("Rhystic Study\nSol Ring");
  });

  it("returns empty string for empty input", () => {
    expect(buildShoppingText([])).toBe("");
  });

  it("never includes prices or quantities", () => {
    const out = buildShoppingText([{ name: "Bolas's Citadel" }]);
    expect(out).not.toMatch(/\$|\d+ /);
  });
});

describe("decklistFilename", () => {
  it("appends .txt", () => {
    expect(decklistFilename("My Deck")).toBe("My Deck.txt");
  });

  it("replaces path separators and reserved characters", () => {
    expect(decklistFilename('a/b\\c:d*e?f"g<h>i|j')).toBe("a-b-c-d-e-f-g-h-i-j.txt");
  });

  it("replaces control characters like newlines and tabs", () => {
    expect(decklistFilename("line1\nline2\tend")).toBe("line1-line2-end.txt");
  });

  it("falls back to 'deck' for whitespace-only names", () => {
    expect(decklistFilename("   ")).toBe("deck.txt");
  });

  it("strips Windows-invalid trailing dots and spaces", () => {
    expect(decklistFilename("My Deck. . ")).toBe("My Deck.txt");
  });

  it("falls back to 'deck' for reserved names '.' and '..'", () => {
    expect(decklistFilename(".")).toBe("deck.txt");
    expect(decklistFilename("..")).toBe("deck.txt");
  });
});

describe("shoppingFilename", () => {
  it("appends em-dash shopping.txt", () => {
    expect(shoppingFilename("My Deck")).toBe("My Deck — shopping.txt");
  });
});
