import { describe, expect, it } from "vitest";

import type { BrowseListCard } from "../collection/browse";
import type { AvailabilitySummary } from "../cards/availability";
import type { CommanderRankings, CommanderRowItem } from "../commanders/rankings";
import type { ResultsPage } from "../intake/rows";
import type { TrialFigures } from "../intake/trial";
import type { ReadDeck } from "../intake/the-read";
import { emptyParams } from "../intake/params";
import type { StoredReading } from "../profile/stored";
import type { SynopsisState } from "../synopsis/read";
import type { TuningState } from "../tuning/state";
import { projectAnalysis, projectChoose, projectCollection, projectCommanders, projectOverview, projectSuggested } from "./project";

const card = (name: string, quantity: number, sets: [string, number][]): BrowseListCard =>
  ({ oracleId: `o-${name}`, name, quantity, setCounts: sets, typeLine: "Artifact", colorIdentity: [], rarity: "common", layout: "normal" }) as unknown as BrowseListCard;

describe("projectCollection", () => {
  const cards = [card("Zed", 1, [["lea", 1]]), card("Abe", 3, [["lea", 2], ["m21", 1]]), card("Mox", 2, [["m21", 2]])];
  const summary = { owned: 1, hard: 0, soft: 0, claims: [] } as unknown as AvailabilitySummary;

  it("takes the first window in the page's own order (A to Z by name), with each card's availability joined on", () => {
    const out = projectCollection({ cards, availability: new Map([["o-Abe", summary]]), stats: { totalCards: 6, uniqueCards: 3 }, window: 2 });
    expect(out.cards.map((c) => c.name)).toEqual(["Abe", "Mox"]);
    expect(out.cards[0].availability).toEqual(summary);
    expect(out.cards[1].availability).toBeNull();
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

  it("keeps the top rows, each numbered by its place in the whole ranking", () => {
    const out = projectCommanders({ rankings, window: 2 });
    expect(out.total).toBe(4);
    expect(out.rows.map((r) => r.slug)).toEqual(["a", "b"]);
    expect([...out.rankBySlug]).toEqual([["a", 1], ["b", 2]]);
  });

  it("numbers a window of the whole list by the list's own order, not the order it was cut in", () => {
    const out = projectCommanders({ rankings: { items: [items[2], items[0], items[3], items[1]] } as unknown as CommanderRankings, window: 3 });
    expect(out.rows.map((r) => r.slug)).toEqual(["c", "a", "d"]);
    expect([...out.rankBySlug]).toEqual([["c", 1], ["a", 2], ["d", 3]]);
    expect(out.total).toBe(4);
  });
});

describe("projectChoose", () => {
  const page = { rows: [{ oracleId: "c1" }, { oracleId: "c2" }], total: 2 } as unknown as ResultsPage;
  const figures = { owned: 97 } as unknown as TrialFigures;
  const decks: ReadDeck[] = [{ commanderOracleId: "c9", commander: "Ashling, the Limitless", partner: null, themes: [] }];

  it("carries the wish, the page, the theme labels and a short name for each deck commander", () => {
    const out = projectChoose({ params: { ...emptyParams(), words: "something red and fast" }, page, decks, themes: [{ slug: "tokens", label: "Tokens" }], trials: { c1: figures, c2: figures } });
    expect(out.words).toBe("something red and fast");
    expect(out.page).toBe(page);
    expect(out.themeLabels).toEqual({ tokens: "Tokens" });
    expect(out.deckNames).toEqual({ c9: "Ashling" });
  });

  it("draws a row whose fill failed as failed, and one that filled as ready", () => {
    const out = projectChoose({ params: emptyParams(), page, decks: [], themes: [], trials: { c1: figures, c2: null } });
    expect(out.trials).toEqual({ c1: { state: "ready", figures }, c2: { state: "failed" } });
  });

  it("draws a row with no entry at all as failed, never as ready or zero", () => {
    expect(projectChoose({ params: emptyParams(), page, decks: [], themes: [], trials: {} }).trials.c1).toEqual({ state: "failed" });
  });
});

describe("projectAnalysis", () => {
  it("gives the panel's reading: the instant as ISO text, the pin and the benchmarks held with it", () => {
    const stored = { profile: { bracket: 3 }, analyzedAt: new Date("2026-10-30T11:22:00.000Z"), fresh: true, versionId: "v", versionNumber: 1 } as unknown as StoredReading;
    const out = projectAnalysis({ deckId: "d", stored, benchmarks: null });
    expect(out).toEqual({ deckId: "d", reading: { profile: { bracket: 3 }, analyzedAt: "2026-10-30T11:22:00.000Z", fresh: true, versionNumber: 1, benchmarks: null } });
  });
});

describe("projectOverview", () => {
  it("keeps a state that holds an overview and refuses one that does not", () => {
    const state = { synopsis: { id: "s" } } as unknown as SynopsisState;
    expect(projectOverview({ deckId: "d", state })).toEqual({ deckId: "d", state });
    expect(() => projectOverview({ deckId: "d", state: { synopsis: null } as unknown as SynopsisState })).toThrow(/no stored overview/);
  });
});

describe("projectSuggested", () => {
  it("keeps a run that has lines and refuses an empty one", () => {
    const state = { items: [{ id: "i" }] } as unknown as TuningState;
    expect(projectSuggested({ deckId: "d", runId: "r", state })).toEqual({ deckId: "d", runId: "r", state });
    expect(() => projectSuggested({ deckId: "d", runId: "r", state: { items: [] } as unknown as TuningState })).toThrow(/no lines/);
  });
});
