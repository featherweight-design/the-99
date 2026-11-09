import { describe, expect, it } from "vitest";

import type { BrowseListCard } from "../collection/browse";
import type { AvailabilitySummary } from "../cards/availability";
import type { CommanderRankings, CommanderRowItem } from "../commanders/rankings";
import { projectCollection, projectCommanders } from "./project";

const card = (name: string, quantity: number, sets: [string, number][]): BrowseListCard =>
  ({ oracleId: `o-${name}`, name, quantity, setCounts: sets, typeLine: "Artifact", colorIdentity: [], rarity: "common", layout: "normal" }) as unknown as BrowseListCard;

describe("projectCollection", () => {
  const cards = [card("Zed", 1, [["lea", 1]]), card("Abe", 3, [["lea", 2], ["m21", 1]]), card("Mox", 2, [["m21", 2]])];
  const summary = { owned: 1, hard: 0, soft: 0, claims: [] } as unknown as AvailabilitySummary;

  it("takes the first window in the page's own order, with each card's availability joined on", () => {
    const out = projectCollection({ cards, availability: new Map([["o-Abe", summary]]), stats: { totalCards: 6, uniqueCards: 3 }, window: 2 });
    expect(out.cards).toHaveLength(2);
    expect(out.cards.find((c) => c.name === "Abe")?.availability).toEqual(summary);
    expect(out.cards.every((c) => c.availability === null || c.availability === summary)).toBe(true);
  });

  it("counts the sets the whole collection comes from, not the window's", () => {
    const out = projectCollection({ cards, availability: null, stats: { totalCards: 6, uniqueCards: 3 }, window: 1 });
    expect(out.setCount).toBe(2);
    expect(out.totalCards).toBe(6);
    expect(out.uniqueCards).toBe(3);
    expect(out.cards).toHaveLength(1);
    expect(out.cards[0].availability).toBeNull();
  });

  it("a window larger than the collection is the whole collection", () => {
    expect(projectCollection({ cards, availability: null, stats: { totalCards: 6, uniqueCards: 3 }, window: 50 }).cards).toHaveLength(3);
  });
});

describe("projectCommanders", () => {
  const items = ["a", "b", "c", "d"].map((slug) => ({ slug, name: slug.toUpperCase() }) as unknown as CommanderRowItem);
  const rankings = { items } as unknown as CommanderRankings;

  it("keeps the top rows and each one's place in the whole ranking", () => {
    const out = projectCommanders({ rankings, window: 2 });
    expect(out.total).toBe(4);
    expect(out.rows.map((r) => r.slug)).toEqual(["a", "b"]);
    expect([...out.rankBySlug]).toEqual([["a", 1], ["b", 2]]);
  });

  it("leaves a gap rather than closing it when the cut rows are not the top rows of the list", () => {
    const out = projectCommanders({ rankings: { items: [items[2], items[0], items[3]] } as unknown as CommanderRankings, window: 3 });
    expect(out.rankBySlug.get("d")).toBe(3);
  });
});
