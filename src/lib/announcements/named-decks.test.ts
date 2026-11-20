import { describe, expect, it } from "vitest";
import { deckSlots, filterSlots } from "./named-decks";
import type { EarlySet, EarlyTile } from "./early-tiles";

const tile = (name: string): EarlyTile => ({ href: `/early/${name}`, name, commanders: [], identity: [], identityKnown: true, owned: 0, of: 99 });
const set = (names: string[], extra: Partial<EarlySet> = {}): EarlySet => ({ lists: names.map(tile), promised: null, ...extra });

describe("deckSlots", () => {
  it("draws a name tile for every name with no list, in the post's order", () => {
    const { slots, decks } = deckSlots(["A", "B", "C"], undefined);
    expect(slots.map((s) => s.kind)).toEqual(["name", "name", "name"]);
    expect(decks).toBe(3);
  });

  it("puts a posted list in the slot of the name it matches, folding case and accents", () => {
    const { slots } = deckSlots(["Alpha", "Élan Vital", "Gamma"], set(["élan vital"]));
    expect(slots.map((s) => (s.kind === "list" ? `list:${s.tile.name}` : `name:${s.name}`))).toEqual(["name:Alpha", "list:élan vital", "name:Gamma"]);
  });

  it("appends a list that matches no name, and counts the larger of names and posted", () => {
    const { slots, decks } = deckSlots(["A"], set(["A", "Z"]));
    expect(slots.map((s) => s.kind)).toEqual(["list", "list"]);
    expect(decks).toBe(2);
  });

  it("uses each list once", () => {
    const { slots } = deckSlots(["A", "A"], set(["A"]));
    expect(slots.map((s) => s.kind)).toEqual(["list", "name"]);
  });

  it("draws nothing for a name whose list gave way to its release list", () => {
    const { slots } = deckSlots(["A", "B"], set([], { releasedNames: ["a"], releasedLists: 1 }));
    expect(slots.map((s) => s.kind === "name" && s.name)).toEqual(["B"]);
  });
});

describe("filterSlots", () => {
  const { slots } = deckSlots(["Merfolk Regiment", "Seal the Deal"], set(["Seal the Deal"]));
  const kept = new Set([(slots[1] as { tile: EarlyTile }).tile]);
  it("keeps everything with no filter", () => {
    expect(filterSlots(slots, kept, { q: "", colours: [] }, false)).toHaveLength(2);
  });
  it("matches a named deck by its name", () => {
    expect(filterSlots(slots, new Set(), { q: "merfolk", colours: [] }, false)).toHaveLength(1);
  });
  it("drops a named deck under a color filter", () => {
    expect(filterSlots(slots, kept, { q: "", colours: ["U"] }, false).map((s) => s.kind)).toEqual(["list"]);
  });
});
