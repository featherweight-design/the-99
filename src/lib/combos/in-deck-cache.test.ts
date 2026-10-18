import { readFileSync } from "node:fs";
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

const base = { deckId: "d1", deckOracleIds: ["b", "a", "c"], commanderOracleIds: ["k"] };

beforeEach(() => {
  m.store.clear();
  m.loads = 0;
  m.partners = new Map([["a", { oracleId: "a", partnerOracleId: "b", partnerName: "B", popularity: 3, variantId: "v1" }]]);
});

describe("inDeckPartnersKey: a content-addressed key", () => {
  it("is the same for the same deck however its cards are ordered or repeated", () => {
    expect(inDeckPartnersKey({ ...base, deckOracleIds: ["c", "a", "b", "a"] })).toEqual(inDeckPartnersKey(base));
  });

  it("changes with the card list, the commanders and the deck", () => {
    const k = (over: Partial<typeof base>) => inDeckPartnersKey({ ...base, ...over }).join("/");
    const same = k({});
    expect(k({ deckOracleIds: ["a", "b", "c", "d"] })).not.toBe(same);
    expect(k({ deckOracleIds: ["a", "b"] })).not.toBe(same);
    expect(k({ commanderOracleIds: ["k", "p"] })).not.toBe(same);
    expect(k({ deckId: "d2" })).not.toBe(same);
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

  it("misses when the card list changes; the combo index generation is `cacheForUser`'s catalog generation, proved in its own suite", async () => {
    await ask();
    await ask({ deckOracleIds: ["a", "b", "c", "d"] });
    expect(m.loads).toBe(2);
  });

  it("keeps two readers' entries apart", async () => {
    await ask();
    await ask({ userId: "u2" });
    expect(m.loads).toBe(2);
  });
});

describe("the combo index generation the key relies on", () => {
  // The key carries no combo stamp of its own: it relies on `cacheForUser`'s catalog generation, which holds only while BOTH combo
  // publishers stamp `catalog_refreshes` after their variants. If either stops, a combo refresh would no longer retire these entries.
  it("is stamped by the seed after it publishes the variants, and by the copy harness inside its publish transaction", () => {
    const seed = readFileSync("src/lib/spellbook/seed.ts", "utf8");
    expect(seed.indexOf("await stampCatalogRefresh()")).toBeGreaterThan(seed.indexOf("await publishVariants("));
    const copy = readFileSync("scripts/lib/catalog-copy.ts", "utf8");
    const publish = copy.slice(copy.indexOf("export function publishOnTarget"));
    expect(publish.slice(0, publish.indexOf("\n}\n"))).toContain("stampCatalogRefreshIn(tx)");
    expect(readFileSync("scripts/copy-combos.ts", "utf8")).toContain("runCopyCli(");
  });
});
