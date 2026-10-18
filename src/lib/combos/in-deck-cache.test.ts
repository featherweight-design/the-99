import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  store: new Map<string, unknown>(),
  loads: 0,
  partners: new Map<string, unknown>(),
}));

// A cache that behaves like the real one where it matters here: an entry is found only under the SAME key.
vi.mock("../cache/user-lists", () => ({
  cacheForUser: async (userId: string, key: string[], load: () => Promise<unknown>) => {
    const k = `${userId}|${key.join("|")}`;
    if (!m.store.has(k)) m.store.set(k, JSON.parse(JSON.stringify(await load())));
    return m.store.get(k);
  },
}));
vi.mock("./near-miss", () => ({
  loadInDeckPartners: async () => {
    m.loads += 1;
    return m.partners;
  },
}));

import { inDeckPartnersKey, loadInDeckPartnersCached } from "./in-deck-cache";

const base = { deckId: "d1", deckOracleIds: ["b", "a", "c"], commanderOracleIds: ["k"], generation: "100.5" };

beforeEach(() => {
  m.store.clear();
  m.loads = 0;
  m.partners = new Map([["a", { oracleId: "a", partnerOracleId: "b", partnerName: "B", popularity: 3, variantId: "v1" }]]);
});

describe("inDeckPartnersKey: a content-addressed key", () => {
  it("is the same for the same deck however its cards are ordered or repeated", () => {
    expect(inDeckPartnersKey({ ...base, deckOracleIds: ["c", "a", "b", "a"] })).toEqual(inDeckPartnersKey(base));
  });

  it("changes with the card list, the commanders, the deck and the combo generation", () => {
    const k = (over: Partial<typeof base>) => inDeckPartnersKey({ ...base, ...over }).join("/");
    const same = k({});
    expect(k({ deckOracleIds: ["a", "b", "c", "d"] })).not.toBe(same);
    expect(k({ deckOracleIds: ["a", "b"] })).not.toBe(same);
    expect(k({ commanderOracleIds: ["k", "p"] })).not.toBe(same);
    expect(k({ deckId: "d2" })).not.toBe(same);
    expect(k({ generation: "200.5" })).not.toBe(same);
  });

  it("tells a card in the list from the same card in the command zone (rule 3: a commander counts as held)", () => {
    const inList = inDeckPartnersKey({ ...base, deckOracleIds: ["a", "b", "c", "k"], commanderOracleIds: [] }).join("/");
    const commander = inDeckPartnersKey({ ...base, deckOracleIds: ["a", "b", "c"], commanderOracleIds: ["k"] }).join("/");
    expect(inList).not.toBe(commander);
  });
});

describe("loadInDeckPartnersCached", () => {
  const ask = (over: Partial<Parameters<typeof loadInDeckPartnersCached>[0]> = {}) =>
    loadInDeckPartnersCached({ userId: "u1", ...base, ...over });

  it("returns the loader's partners as a Map, and loads once for an unchanged deck", async () => {
    const first = await ask();
    expect(first).toBeInstanceOf(Map);
    expect(first.get("a")).toMatchObject({ partnerOracleId: "b" });
    await ask();
    await ask({ deckOracleIds: ["c", "b", "a"] });
    expect(m.loads).toBe(1);
  });

  it("misses when the card list changes, and when the combo index generation changes", async () => {
    await ask();
    await ask({ deckOracleIds: ["a", "b", "c", "d"] });
    expect(m.loads).toBe(2);
    await ask({ generation: "999.9" });
    expect(m.loads).toBe(3);
  });

  it("keeps two readers' entries apart", async () => {
    await ask();
    await ask({ userId: "u2" });
    expect(m.loads).toBe(2);
  });
});
