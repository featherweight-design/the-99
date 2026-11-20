import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { blendThemePages, themeSlugsFor, type ThemePage } from "./build-support";

const tags = [
  { slug: "infect", label: "Infect", count: 3545 },
  { slug: "planeswalkers", label: "Planeswalkers", count: 1789 },
];

describe("themeSlugsFor", () => {
  it("matches a Help me choose label or a mapped slug, case-blind, and drops what the commander has no tag for", () => {
    expect(themeSlugsFor(["Planeswalkers"], tags)).toEqual(["planeswalkers"]);
    expect(themeSlugsFor(["planeswalkers", "superfriends"], tags)).toEqual(["planeswalkers"]);
    expect(themeSlugsFor(["Voltron"], tags)).toEqual([]);
  });
});

describe("blendThemePages", () => {
  const page = (slug: string, deckCount: number, cards: [string, number | null, number | null][]): ThemePage =>
    ({ slug, deckCount, cards: cards.map(([name, inclusion, synergy]) => ({ name, inclusion, synergy })) });
  const a = page("a", 300, [["Teferi", 60, 0.5], ["Sol Ring", 80, 0]]);
  const b = page("b", 100, [["Sol Ring", 40, 0], ["Doubling Season", 90, 0.4]]);

  it("weighs each page by its decks under all, a card a page lacks counting 0 there", () => {
    const r = blendThemePages([a, b], "all")!;
    expect(r.inclusionByName).toEqual({ teferi: 45, "sol ring": 70, "doubling season": 22.5 });
    // First-seen order: the caller ranks.
    expect(r.topCards).toEqual(["Teferi", "Sol Ring", "Doubling Season"]);
  });

  it("takes each card's best page under any", () => {
    const r = blendThemePages([a, b], "any")!;
    expect(r.inclusionByName).toEqual({ teferi: 60, "sol ring": 80, "doubling season": 90 });
    expect(r.synergyByName["doubling season"]).toBe(0.4);
  });

  it("is one page itself, and nothing for no pages", () => {
    expect(blendThemePages([a], "all")!.inclusionByName).toEqual({ teferi: 60, "sol ring": 80 });
    expect(blendThemePages([], "any")).toBeNull();
  });
});
