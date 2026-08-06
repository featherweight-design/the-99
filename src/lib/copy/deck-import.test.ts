import { describe, expect, it } from "vitest";
import { deckImportCopy } from "./deck-import";

const { entry, commander } = deckImportCopy;

describe("deckImportCopy.entry.submitPasteCount", () => {
  // An empty paste used to offer "Import 0 cards", which reads as a promise to
  // import nothing rather than a prompt to paste something.
  it("names no figure before there is one to name", () => {
    expect(entry.submitPasteCount(0)).toBe("Import deck →");
  });

  it("says card, not cards, for a one-card list", () => {
    expect(entry.submitPasteCount(1)).toBe("Import 1 card");
  });

  it("counts the rest", () => {
    expect(entry.submitPasteCount(99)).toBe("Import 99 cards");
  });
});

describe("deckImportCopy.commander count strings", () => {
  // A list with exactly one unmarked legendary opens the picker — only a list
  // with none is the dead end — so the singular is reachable.
  it("says creature, not creatures, for a single candidate", () => {
    expect(commander.count(1)).toBe("1 legendary creature in this import");
    expect(commander.introMobile(1)).toContain("1 legendary creature came over.");
  });

  it("pluralises the rest", () => {
    expect(commander.count(3)).toBe("3 legendary creatures in this import");
    expect(commander.introMobile(3)).toContain("3 legendary creatures came over.");
  });
});
