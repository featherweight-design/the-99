import { describe, expect, it } from "vitest";
import { assembleCollector, assembleDeckChoices } from "./open-read";
import type { ReaderDeck } from "./list";

// The picker's read path, from the reader's decks: the K7 component test builds the finished
// choices by hand, so only this pins what the server hands it.
describe("assembleDeckChoices", () => {
  const precon = { cards: new Set(["sol-ring", "arcane-signet", "ulamog"]), commanders: ["ulalek"] };
  const decks: ReaderDeck[] = [
    { id: "here", name: "Already linked", commanders: ["ulalek"], cards: new Set(["ulalek", "sol-ring"]), builtFrom: "EldraziUnbound_CMM" },
    { id: "low", name: "Beta", commanders: ["x"], cards: new Set(["x", "sol-ring"]), builtFrom: "Other_C21" },
    { id: "high", name: "zeta", commanders: ["ulalek"], cards: new Set(["ulalek", "sol-ring", "arcane-signet"]), builtFrom: null },
    { id: "gone", name: "Gamma", commanders: ["x"], cards: new Set(["x"]), builtFrom: "Dropped_C13" },
  ];
  const choices = assembleDeckChoices(
    decks, "EldraziUnbound_CMM", precon,
    new Map([["ulalek", "Ulalek, Fused Atrocity"], ["x", "X"]]),
    new Map([["Other_C21", "Other Deck"]]),
  );

  it("leaves out the deck already linked to this precon", () => {
    expect(choices.map((c) => c.deckId)).not.toContain("here");
  });

  it("names the precon a deck is linked to elsewhere, and nothing for one the feed dropped", () => {
    expect(choices.find((c) => c.deckId === "low")!.linkedElsewhere).toBe("Other Deck");
    expect(choices.find((c) => c.deckId === "high")!.linkedElsewhere).toBeNull();
    expect(choices.find((c) => c.deckId === "gone")!.linkedElsewhere).toBeNull();
  });

  // Names alone would sort Beta, Gamma, zeta: the overlap decides first.
  it("orders by overlap, the larger first, and names each deck's commanders", () => {
    expect(choices.map((c) => c.deckId)).toEqual(["high", "low", "gone"]);
    expect(choices[0].commanders).toEqual(["Ulalek, Fused Atrocity"]);
  });
});

describe("assembleCollector", () => {
  const line = (oracleId: string, over: Record<string, unknown> = {}) => ({
    oracleId, quantity: 1, foilQuantity: 1, isCommander: false, name: oracleId, typeLine: "Artifact", manaCost: null, layout: "normal",
    colorIdentity: [], imageUri: `art-${oracleId}`, legal: true, scryfallId: `ce-${oracleId}`, setCode: "cmc", collectorNumber: "9",
    printingImage: `ce-art-${oracleId}`, printingBack: null, ...over,
  });

  it("carries the twin's own file, printings, foil counts and added date, and the plain edition's ownership", () => {
    const ce = assembleCollector("TwinCE_CMC", [line("sol"), line("plains", { typeLine: "Basic Land — Plains", quantity: 10, foilQuantity: 10 })], new Set(["sol"]), "2026-10-13T09:00:00.000Z");
    expect(ce.fileName).toBe("TwinCE_CMC");
    expect(ce.addedOn).toBe("2026-10-13T09:00:00.000Z");
    expect(ce.cards.map((c) => [c.oracleId, c.foil, c.owned, c.basic, c.printing?.label])).toEqual([
      ["sol", 1, true, false, "CMC 9"],
      ["plains", 10, false, true, "CMC 9"],
    ]);
  });
});
