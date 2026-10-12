import { describe, expect, it } from "vitest";
import {
  buildDecklistText,
  commanderExportName,
  buildShoppingText,
  decklistFilename,
  shoppingFilename,
} from "./export-helpers";
import { buildDeckImport, type ImportCatalogCard } from "./import";
import { cardTypeGroup } from "./grouping";

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
  layout: "normal",
  manaCost: null,
  ...over,
});
const catalog = [
  card("Atreus, God of War", { typeLine: "Legendary Creature — God" }),
  card("Kratos, God of War", { typeLine: "Legendary Creature — God" }),
  card("Lightning Bolt", { typeLine: "Instant" }),
];

describe("buildDecklistText, grouped by type (bug batch 2026-10-12)", () => {
  // The deck view's groups, as `cardTypeGroup` files them: a land creature is a land, and a modal
  // DFC is filed by its front face, so `Sorcery // Land` is a sorcery.
  const typed = [
    card("Sol Ring", { typeLine: "Artifact" }),
    card("Cultivate", { typeLine: "Sorcery" }),
    card("Shatterskull Smashing // Shatterskull, the Hammer Pass", { typeLine: "Sorcery // Land" }),
    card("Llanowar Elves", { typeLine: "Creature — Elf Druid" }),
    card("Dryad Arbor", { typeLine: "Land Creature — Forest Dryad" }),
    card("Forest", { typeLine: "Basic Land — Forest" }),
    card("Swords to Plowshares", { typeLine: "Instant" }),
    card("Rhystic Study", { typeLine: "Enchantment" }),
    card("Karn, the Great Creator", { typeLine: "Legendary Planeswalker — Karn" }),
    card("Atreus, God of War", { typeLine: "Legendary Creature — God" }),
  ];
  const body = typed.filter((c) => c.name !== "Atreus, God of War").map((c) => ({
    name: c.name,
    quantity: c.name === "Forest" ? 5 : 1,
    typeGroup: cardTypeGroup(c.typeLine),
  }));

  it("writes the commander first, then each type under its header, in the deck view's order", () => {
    const text = buildDecklistText({ commanderName: "Atreus, God of War", partnerName: null, cards: body });
    expect(text).toBe(
      [
        "Commander", "1 Atreus, God of War",
        "", "Creatures (1)", "1 Llanowar Elves",
        "", "Instants (1)", "1 Swords to Plowshares",
        "", "Sorceries (2)", "1 Cultivate", "1 Shatterskull Smashing // Shatterskull, the Hammer Pass",
        "", "Artifacts (1)", "1 Sol Ring",
        "", "Enchantments (1)", "1 Rhystic Study",
        "", "Planeswalkers (1)", "1 Karn, the Great Creator",
        "", "Lands (6)", "1 Dryad Arbor", "5 Forest",
      ].join("\n"),
    );
  });

  it("imports back to the same list: same commander, same cards, same quantities, no header read as a card", () => {
    const text = buildDecklistText({ commanderName: "Atreus, God of War", partnerName: null, cards: body });
    const back = buildDeckImport({ text, catalog: typed });
    expect(back.declaredCommander?.name).toBe("Atreus, God of War");
    expect(back.unresolved).toEqual([]);
    const got = back.cards.map((c) => [c.oracleId, c.quantity]).sort();
    const want = body.map((c) => [`oracle-${c.name.toLowerCase().replace(/[^a-z]+/g, "-")}`, c.quantity]).sort();
    expect(got).toEqual(want);
    // Every card line and the commander's, and not one of the eight headers.
    expect(back.lineCount).toBe(body.length + 1);
  });
});

describe("buildDecklistText", () => {
  it("emits a Commander section holding both, and round-trips through the parser", () => {
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: "Kratos, God of War",
      cards: [{ quantity: 1, name: "Lightning Bolt" }],
    });
    expect(text).toBe(
      "Commander\n1 Atreus, God of War\n1 Kratos, God of War\n\nOther (1)\n1 Lightning Bolt",
    );

    const back = buildDeckImport({ text, catalog });
    expect(back.declaredCommander?.name).toBe("Atreus, God of War");
    expect(back.declaredPartner?.name).toBe("Kratos, God of War");
    expect(back.cards.map((c) => c.oracleId)).toEqual(["oracle-lightning-bolt"]);
  });

  it("names each commander's printing, and the export round-trips to the same picks", () => {
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: "Kratos, God of War",
      commanderPrinting: { setCode: "SLD", collectorNumber: "2212" },
      partnerPrinting: { setCode: "SLD", collectorNumber: "2213" },
      cards: [{ quantity: 1, name: "Lightning Bolt", setCode: "M11", collectorNumber: "149" }],
    });
    expect(text).toBe(
      "Commander\n1 Atreus, God of War (SLD) 2212\n1 Kratos, God of War (SLD) 2213\n\nOther (1)\n1 Lightning Bolt (M11) 149",
    );
    // Deck printings E4: importing the export names the same printings, commanders included.
    const back = buildDeckImport({ text, catalog });
    expect(back.declaredCommander?.name).toBe("Atreus, God of War");
    expect(back.declaredPartner?.name).toBe("Kratos, God of War");
    expect(back.printings.map((p) => [p.oracleId, p.setCode, p.collectorNumber])).toEqual([
      ["oracle-atreus-god-of-war", "sld", "2212"],
      ["oracle-kratos-god-of-war", "sld", "2213"],
      ["oracle-lightning-bolt", "m11", "149"],
    ]);
  });

  it("names a renamed commander printing by its face, and round-trips its catalog collector number", () => {
    const atreus = { name: "Atreus, God of War", printedName: "Atreus, Son of Kratos", printedSetCode: "SLD", printedCollectorNumber: "2212" };
    expect(commanderExportName(atreus)).toBe("Atreus, Son of Kratos");
    // No printing named: the oracle name, as main exports it.
    expect(commanderExportName({ ...atreus, printedSetCode: null })).toBe("Atreus, God of War");
    // A set with no collector number names no printing (`bodyLine`), so the line keeps the oracle name.
    expect(commanderExportName({ ...atreus, printedCollectorNumber: "" })).toBe("Atreus, God of War");
    // A catalog collector number with an underscore still parses back into its printing.
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: null,
      cards: [
        { quantity: 1, name: "Lightning Bolt", setCode: "PRM", collectorNumber: "a1_2007" },
        // The longest set code a pick accepts.
        { quantity: 1, name: "Kratos, God of War", setCode: "ABCDEFGH", collectorNumber: "284" },
      ],
    });
    const back = buildDeckImport({ text, catalog });
    expect(back.cards.map((c) => c.oracleId)).toEqual(["oracle-lightning-bolt", "oracle-kratos-god-of-war"]);
    expect(back.printings.map((p) => [p.setCode, p.collectorNumber])).toEqual([["prm", "a1_2007"], ["abcdefgh", "284"]]);
  });

  it("names a commander with no printing by name alone", () => {
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: null,
      commanderPrinting: { setCode: undefined, collectorNumber: undefined },
      cards: [],
    });
    expect(text).toBe("Commander\n1 Atreus, God of War");
  });

  // One shape for both: the old bare-first-line form parsed correctly only by
  // the convention that line one is the commander.
  it("emits the section for a single commander too", () => {
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: null,
      cards: [{ quantity: 1, name: "Lightning Bolt" }],
    });
    expect(text).toBe("Commander\n1 Atreus, God of War\n\nOther (1)\n1 Lightning Bolt");
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

  it("ends at the commanders when cards is empty (no trailing newline)", () => {
    const out = buildDecklistText({
      commanderName: "Muldrotha, the Gravetide",
      partnerName: null,
      cards: [],
    });
    expect(out).toBe("Commander\n1 Muldrotha, the Gravetide");
  });

  it("names the printing on each body line", () => {
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: null,
      cards: [{ name: "Battle of Olympus", quantity: 1, setCode: "SLD", collectorNumber: "2208" }],
    });
    expect(text).toBe(
      "Commander\n1 Atreus, God of War\n\nOther (1)\n1 Battle of Olympus (SLD) 2208",
    );
  });

  // The failure this test exists to catch: threading the printing through while
  // still exporting the oracle name would emit `1 World at War (SLD) 2208` — a
  // line naming a printing whose face reads something else.
  it("round-trips a printed name and its printing through buildDeckImport", () => {
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: null,
      cards: [{ name: "Battle of Olympus", quantity: 1, setCode: "SLD", collectorNumber: "2208" }],
    });
    expect(text).toContain("1 Battle of Olympus (SLD) 2208");
    expect(text).not.toContain("World at War");

    const back = buildDeckImport({
      text,
      catalog: [...catalog, card("World at War", { typeLine: "Sorcery" })],
      indexes: {
        flavorNames: [
          { flavorName: "Battle of Olympus", oracleId: "oracle-world-at-war" },
        ],
      },
    });
    expect(back.cards.map((c) => c.oracleId)).toEqual(["oracle-world-at-war"]);
    expect(back.unresolved).toEqual([]);
  });

  it("falls back to a bare line when the printing is unknown", () => {
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: null,
      cards: [{ name: "Cultivate", quantity: 2 }],
    });
    expect(text).toContain("2 Cultivate");
    // The card lines name no printing; the section header's `(1)` count is not one.
    expect(text.split("\n").filter((l) => /^\d/.test(l)).join("\n")).not.toContain("(");
  });

  it("omits the printing when only half of it is known", () => {
    const text = buildDecklistText({
      commanderName: "Atreus, God of War",
      partnerName: null,
      cards: [
        { name: "Sol Ring", quantity: 1, setCode: "LTC" },
        { name: "Forest", quantity: 2, collectorNumber: "280" },
      ],
    });
    expect(text.split("\n").slice(-2)).toEqual(["1 Sol Ring", "2 Forest"]);
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

  // #330: we recommend an oracle card and let the player pick the printing on
  // Mana Pool's grid. Pinning `(SLD) 2208` here would quote the priciest
  // printing of every card, so the decklist's format must not leak across.
  it("names no printing, even when the card carries one", () => {
    const cards = [
      { name: "Cultivate", setCode: "M21", collectorNumber: "177" },
      { name: "World at War", setCode: "SLD", collectorNumber: "2208" },
    ];
    expect(buildShoppingText(cards)).toBe("Cultivate\nWorld at War");
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
