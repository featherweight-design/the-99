import { describe, expect, it } from "vitest";
import { deckPasteCardCount } from "./paste-count";
import { parsePasteList } from "../manabox/paste";

// Bug batch 2026-10-12: a Zul Ashur list pasted into "Your list" read `113 cards`, because its
// `Commander` and `Deck` header lines (and a board under them) were counted as cards.
describe("deckPasteCardCount", () => {
  it("counts no section header, and nothing under a sideboard or maybeboard", () => {
    const text = [
      "Commander", "1 Zul Ashur, Lich Lord",
      "", "Deck (3)", "1 Sol Ring", "2 Island",
      "", "Creatures (1)", "1 Llanowar Elves",
      "", "Sideboard (2):", "1 Counterspell", "1 Ponder",
      "", "Maybeboard", "1 Brainstorm",
      "", "Companion", "1 Lurrus of the Dream-Den",
    ].join("\n");
    expect(deckPasteCardCount(text)).toBe(6);
  });

  it("counts a plain list as it always has, and nothing for an empty box", () => {
    expect(deckPasteCardCount("3 Sol Ring\nCultivate")).toBe(4);
    expect(deckPasteCardCount("  \n")).toBe(0);
  });

  it("counts a CSV by its quantities, and a CSV the import refuses as nothing", () => {
    expect(deckPasteCardCount("Name,Quantity\nSol Ring,2\nCultivate,1")).toBe(3);
    expect(deckPasteCardCount("Name,Quantity\nSol Ring,two")).toBe(0);
  });
});

describe("parsePasteList and section headers", () => {
  it("skips a header line, keeps what follows it (a collection's sideboard copies are still owned)", () => {
    const { rows } = parsePasteList("Commander\n1 Sol Ring\nSideboard:\n1 Ponder\nLands (37)\n2 Island");
    expect(rows.map((r) => [r.name, r.quantity])).toEqual([["Sol Ring", 1], ["Ponder", 1], ["Island", 2]]);
  });

  it("still reads a card whose name only starts with a header word", () => {
    const { rows } = parsePasteList("1 Sideboard Shenanigans\nLand Tax\n1 Deck");
    expect(rows.map((r) => r.name)).toEqual(["Sideboard Shenanigans", "Land Tax", "Deck"]);
  });
});
