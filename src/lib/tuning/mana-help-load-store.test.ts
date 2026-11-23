import { describe, expect, it, vi } from "vitest";

// Store choice (design #3200): Improve my mana's staples are read in the store the action resolved, so the
// figure beside each buy link is that store's. This pins the hop from `loadManaHelp` to `loadManaStaples`.

const state = vi.hoisted(() => ({ stapleStores: [] as string[] }));

const BASICS = ["Plains", "Island", "Swamp", "Mountain", "Forest"].map((name) => ({ id: `id-${name}`, name }));

vi.mock("../../db", () => {
  // Any select chain: the first resolves to the basics, every later one to no rows.
  let first = true;
  const chain: object = new Proxy(() => chain, {
    get: (_t, key) => (key === "then"
      ? (resolve: (rows: unknown[]) => void) => { const rows = first ? BASICS : []; first = false; resolve(rows); }
      : () => chain),
    apply: () => chain,
  });
  return { db: { select: () => chain } };
});
vi.mock("./mana-balance-load", () => ({ loadManaInputs: async () => ({ rows: [], nameOf: (id: string) => id, landText: new Map() }) }));
vi.mock("../decks/locks", () => ({ liveLockedIds: async () => new Set<string>() }));
vi.mock("../decks/cuts-read", () => ({ readCutSupport: async () => null }));
vi.mock("../decks/deck-mix", () => ({ loadDeckMix: async () => ({ cells: { land: { target: 36 } } }) }));
vi.mock("./mana-staples", async (orig) => ({
  ...(await orig<typeof import("./mana-staples")>()),
  // Null stops the read right after the hop under test.
  loadManaStaples: async (_deck: unknown, _user: string, store: string) => { state.stapleStores.push(store); return null; },
}));

import type { DeckDetail } from "../decks/read";
import { loadManaHelp } from "./mana-help-load";

const deck = { id: "deck", commander: { oracleId: "cmd", name: "Cmd", colorIdentity: ["G"] }, partner: null, cards: [] } as unknown as DeckDetail;

describe("loadManaHelp: the reader's store", () => {
  it("reads the staples in the store it is given", async () => {
    await loadManaHelp(deck, "user_1", "G", "tcgplayer");
    expect(state.stapleStores).toEqual(["tcgplayer"]);
  });
});
