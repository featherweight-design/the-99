import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

// Store choice (design #3200): the stand-ins sheet's pool and every figure on it are the reader's store's, so the
// foot's "from {store}" names the store the figures came from. These pin the two hops `loadStandIns` makes with it.

const state = vi.hoisted(() => ({
  original: null as Record<string, unknown> | null,
  pools: [] as string[],
  priceReads: [] as unknown[][],
}));

const dialect = new PgDialect();
vi.mock("../../db", () => ({
  db: {
    execute: async (query: SQL) => {
      const text = dialect.sqlToQuery(query).sql;
      if (/from decks where/.test(text)) return { rows: [{ commander: "cmd", partner: null }] };
      if (/from deck_cards dc/.test(text)) return { rows: [] };
      if (/color_identity, type_line, oracle_text from cards/.test(text)) return { rows: [{ oracle_id: "cmd", name: "Cmd", color_identity: ["G"], type_line: "Legendary Creature", oracle_text: null }] };
      if (/null::real as inclusion/.test(text)) return { rows: state.original ? [state.original] : [] };
      // The pool, and the type lists a spell reads: every other statement.
      state.pools.push(text);
      return { rows: [] };
    },
  },
}));
vi.mock("../decks/price-query", async (orig) => ({
  ...(await orig<typeof import("../decks/price-query")>()),
  loadPrices: async (...args: unknown[]) => { state.priceReads.push(args); return new Map(); },
}));
vi.mock("../staples/universal", () => ({ loadUniversalStaples: async () => new Set<string>() }));
vi.mock("../labels/read", () => ({ readLabels: async () => new Map() }));
vi.mock("../cards/chain-art", () => ({ chainArt: async () => new Map() }));
vi.mock("../decks/availability-query", () => ({ loadAvailability: async () => new Map() }));

import { loadStandIns } from "./gather";

const DECK = "11111111-1111-4111-8111-111111111111";
const CUT = "22222222-2222-4222-8222-222222222222";
const card = (typeLine: string, text: string) => ({ oracle_id: CUT, name: "Cut", type_line: typeLine, oracle_text: text, keywords: [], cmc: 2, image_uri: null, inclusion: null, synergy: null, owned: null });

beforeEach(() => {
  state.pools = [];
  state.priceReads = [];
});

describe("loadStandIns: the reader's store", () => {
  it("chooses a spell's unlisted pool from the store's own rows, and prices every stand-in there", async () => {
    state.original = card("Sorcery", "Draw two cards.");
    await loadStandIns(DECK, "user_1", CUT, false, "tcgplayer");
    expect(state.pools.some((q) => q.includes("printing_store_prices"))).toBe(true);
    expect(state.priceReads.map((a) => a[3])).toEqual(["tcgplayer"]);
  });

  it("keeps Mana Pool's statement for a Mana Pool reader", async () => {
    state.original = card("Sorcery", "Draw two cards.");
    await loadStandIns(DECK, "user_1", CUT, false, "manapool");
    expect(state.pools.length).toBeGreaterThan(0);
    expect(state.pools.some((q) => q.includes("printing_store_prices"))).toBe(false);
    expect(state.priceReads.map((a) => a[3])).toEqual(["manapool"]);
  });

  it("prices a land's stand-ins in the store too", async () => {
    state.original = card("Land", "{T}: Add {G}.");
    await loadStandIns(DECK, "user_1", CUT, false, "cardkingdom");
    expect(state.priceReads.map((a) => a[3])).toEqual(["cardkingdom"]);
  });
});
