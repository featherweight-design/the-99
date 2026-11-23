import { beforeEach, describe, expect, it, vi } from "vitest";

// Store choice (design #3200): Improve my mana's staples carry the reader's store's figure beside that store's link,
// and History's reopened help reads its staples' figures there too. These pin the store reaching the price read.

const state = vi.hoisted(() => ({
  selects: [] as unknown[][],
  priceReads: [] as unknown[][],
  prices: new Map<string, { liveCents: number | null }>(),
}));

vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => state.selects.shift() ?? [] }) }) },
}));
vi.mock("../discovery/price", () => ({
  loadPrices: async (...args: unknown[]) => { state.priceReads.push(args); return state.prices; },
}));
vi.mock("../decks/stats-labels", () => ({ loadStatsLabels: async () => new Map() }));
vi.mock("../decks/land-mana", () => ({ loadLandMana: async () => ({}) }));
vi.mock("../decks/source-mana", () => ({ loadSourceMana: async () => ({ s1: ["G"] }) }));
vi.mock("../decks/availability-query", () => ({ loadAvailability: async () => new Map() }));

import type { DeckDetail } from "../decks/read";
import { loadManaStaples, loadStaplePricing } from "./mana-staples";

const deck = {
  id: "deck",
  commander: { oracleId: "cmd", name: "Cmd", colorIdentity: ["G"] },
  partner: null,
  cards: [],
} as unknown as DeckDetail;

const staple = { oracleId: "s1", name: "Fire // Ice", typeLine: "Instant", manaCost: "{1}{G}", oracleText: "", keywords: [], layout: "split", colorIdentity: ["G"], imageUri: null };

beforeEach(() => {
  state.selects = [];
  state.priceReads = [];
  state.prices = new Map([["s1", { liveCents: 180 }]]);
});

describe("loadManaStaples: the reader's store", () => {
  it("prices each staple in the store it is given, and carries the card's layout for its link", async () => {
    state.selects = [[{ oracleId: "s1", inclusion: 40 }], [staple]];
    const out = await loadManaStaples(deck, "user_1", "tcgplayer");
    expect(state.priceReads).toEqual([[["s1"], "tcgplayer"]]);
    expect(out?.map((s) => [s.priceCents, s.layout])).toEqual([[180, "split"]]);
  });
});

describe("loadStaplePricing", () => {
  it("reads each staple's figure in the store with its card's layout; a card with no figure has none", async () => {
    state.selects = [[{ oracleId: "s1", layout: "split" }, { oracleId: "s2", layout: "normal" }]];
    const out = await loadStaplePricing(["s1", "s2"], "cardkingdom");
    expect(state.priceReads).toEqual([[["s1", "s2"], "cardkingdom"]]);
    expect([...out]).toEqual([["s1", { priceCents: 180, layout: "split" }], ["s2", { priceCents: null, layout: "normal" }]]);
  });

  it("reads nothing for a help with no staples", async () => {
    expect((await loadStaplePricing([], "tcgplayer")).size).toBe(0);
    expect(state.priceReads).toEqual([]);
  });
});
