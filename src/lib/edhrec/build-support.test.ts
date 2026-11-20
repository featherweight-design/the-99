import { describe, expect, it, vi } from "vitest";

const { results, select } = vi.hoisted(() => {
  const results: unknown[][] = [];
  // Each select answers the next queued result, whatever chain it is built with.
  const chain = (): unknown => {
    const value = results.shift() ?? [];
    const c: Record<string, unknown> = {};
    for (const m of ["from", "where", "innerJoin"]) c[m] = () => c;
    c.then = (r: (v: unknown) => unknown) => Promise.resolve(value).then(r);
    return c;
  };
  return { results, select: vi.fn(chain) };
});
vi.mock("../../db", () => ({ db: { select } }));

import { blendThemePages, loadBuildSupport, themeSlugsFor, type ThemePage } from "./build-support";

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

describe("loadBuildSupport", () => {
  it("reads nothing for a choice the commander has no tag for", async () => {
    select.mockClear();
    expect(await loadBuildSupport("c", tags, ["Voltron"], "any")).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });

  it("groups cards by their page's slug, and drops a page with no stored cards", async () => {
    results.push(
      [{ slug: "planeswalkers", deckCount: 1789 }, { slug: "infect", deckCount: 3545 }],
      [{ slug: "planeswalkers", name: "Teferi", inclusion: 60, synergy: 0.5 }],
    );
    const r = await loadBuildSupport("c", tags, ["Planeswalkers", "Infect"], "all");
    // `infect` stored no cards: only the planeswalkers page is read, so `all` is that page alone.
    expect(r).toEqual({ topCards: ["Teferi"], inclusionByName: { teferi: 60 }, synergyByName: { teferi: 0.5 } });
  });
});
