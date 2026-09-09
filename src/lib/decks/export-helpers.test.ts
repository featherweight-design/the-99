import { describe, expect, it } from "vitest";
import {
  buildDecklistText,
  buildShoppingText,
  decklistFilename,
  shoppingFilename,
} from "./export-helpers";
import { buildDeckImport, type ImportCatalogCard } from "./import";

// The pair the export has to round-trip, and the catalog that reads it back.
const card = (name: string, over: Partial<ImportCatalogCard> = {}): ImportCatalogCard => ({
  oracleId: `oracle-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
  scryfallId: `scry-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
  name,
  typeLine: "Artifact",
  oracleText: null,
  commanderLegal: true,
  colorIdentity: [],
  imageUri: null,
  ...over,
});
const catalog = [
  card("Atreus, God of War", { typeLine: "Legendary Creature — God" }),
  card("Kratos, God of War", { typeLine: "Legendary Creature — God" }),
  card("Lightning Bolt", { typeLine: "Instant" }),
];

describe("buildDecklistText", () => {
  it("emits a Commander section holding both, and round-trips through the parser", () => {
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: "Kratos, God of War",
      cards: [{ quantity: 1, name: "Lightning Bolt" }],
    });
    expect(text).toBe(
      "Commander\n1 Atreus, God of War\n1 Kratos, God of War\n\nDeck\n1 Lightning Bolt",
    );

    const back = buildDeckImport({ text, catalog });
    expect(back.declaredCommander?.name).toBe("Atreus, God of War");
    expect(back.declaredPartner?.name).toBe("Kratos, God of War");
    expect(back.cards.map((c) => c.oracleId)).toEqual(["oracle-lightning-bolt"]);
  });

  // One shape for both: the old bare-first-line form parsed correctly only by
  // the convention that line one is the commander.
  it("emits the section for a single commander too", () => {
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: null,
      cards: [{ quantity: 1, name: "Lightning Bolt" }],
    });
    expect(text).toBe("Commander\n1 Atreus, God of War\n\nDeck\n1 Lightning Bolt");
  });

  it("includes body cards with quantities, in order", () => {
    const out = buildDecklistText({
      commanderName: "Muldrotha, the Gravetide",
      partnerName: null,
      cards: [
        { name: "Sol Ring", quantity: 1 },
        { name: "Forest", quantity: 5 },
      ],
    });
    const lines = out.split("\n");
    expect(lines.slice(-2)).toEqual(["1 Sol Ring", "5 Forest"]);
  });

  it("contains no comment header or separator lines", () => {
    const out = buildDecklistText({
      commanderName: "Muldrotha, the Gravetide",
      partnerName: null,
      cards: [{ name: "Sol Ring", quantity: 1 }],
    });
    expect(out).not.toMatch(/^#|^\/\//m);
  });

  it("ends at the Deck header when cards is empty (no trailing newline)", () => {
    const out = buildDecklistText({
      commanderName: "Muldrotha, the Gravetide",
      partnerName: null,
      cards: [],
    });
    expect(out).toBe("Commander\n1 Muldrotha, the Gravetide\n\nDeck");
  });

  it("produces consistent text for copy and download (same string)", () => {
    const args = {
      commanderName: "Muldrotha, the Gravetide",
      partnerName: null,
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

  it("falls back to 'deck' for Windows-reserved device basenames", () => {
    expect(decklistFilename("CON")).toBe("deck.txt");
    expect(decklistFilename("nul")).toBe("deck.txt");
    expect(decklistFilename("COM1")).toBe("deck.txt");
    expect(decklistFilename("Lpt9")).toBe("deck.txt");
    // Not reserved — contains more than the bare device name.
    expect(decklistFilename("CONTROL")).toBe("CONTROL.txt");
  });
});

describe("shoppingFilename", () => {
  it("appends em-dash shopping.txt", () => {
    expect(shoppingFilename("My Deck")).toBe("My Deck — shopping.txt");
  });
});
