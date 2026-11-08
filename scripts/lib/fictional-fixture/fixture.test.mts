import { describe, expect, it } from "vitest";
import { ARCHETYPES, assembleOwned, assignPrintings, collectionFingerprint, TARGETS, type CatalogCard, type CatalogCommander, type CatalogPrinting, type CatalogSnapshot } from "./collection";
import { DECK_SIZES, planDecks, planTotal } from "./decks";
import { FACE_COUNT, readFaces, type FixtureSql } from "./context";
import { PROXY_DECK_ROLE, pickProxyCards } from "./extras";
import { DECK_NAMES, FRIEND_NAMES, PLAYER_NAME } from "./names";
import { ABOUT_DECK_IDS, DECK_ROLES, mulberry32, streamFor, uuidV5 } from "./rng";

const COLORS = ["W", "U", "B", "R", "G"];
const subsets = (): string[][] => {
  const out: string[][] = [[]];
  for (const c of COLORS) for (const s of [...out]) out.push([...s, c]);
  return out.filter((s) => s.length <= 2);
};

/** A made-up catalog: ids and names that mean nothing, shaped like the real one. */
function fakeCatalog(): CatalogSnapshot {
  const ids = (n: number, k: string) => `${k}${String(n).padStart(8, "0")}-0000-4000-8000-000000000000`;
  const sets = subsets();
  const cards: CatalogCard[] = [];
  for (let i = 0; i < 6000; i += 1) {
    const colors = sets[i % sets.length];
    cards.push({
      oracleId: ids(i, "c"), name: `Card ${i}`, colors, pop: 6000 - i,
      typeLine: i % 11 === 0 ? "Land" : i % 5 === 0 ? "Artifact" : "Creature",
      gameChanger: i % 97 === 0, tutor: i % 89 === 0,
    });
  }
  const commanders: CatalogCommander[] = [];
  for (let i = 0; i < 400; i += 1) commanders.push({ oracleId: ids(i, "d"), name: `Commander ${i}`, colors: sets[1 + (i % (sets.length - 1))], support: 900 - i });
  const basics = { W: ids(1, "b"), U: ids(2, "b"), B: ids(3, "b"), R: ids(4, "b"), G: ids(5, "b") };
  return { cards, commanders, basics };
}
const printingsFor = (ids: string[]): Map<string, CatalogPrinting[]> =>
  new Map(ids.map((id, i) => [id, [
    { scryfallId: `${id.slice(0, 8)}-1111-4000-8000-00000000000${i % 10}`, setCode: "fx1", collectorNumber: String(i), finishes: ["nonfoil", "foil"] },
    { scryfallId: `${id.slice(0, 8)}-2222-4000-8000-00000000000${i % 10}`, setCode: "fx2", collectorNumber: String(i), finishes: ["nonfoil", "foil"] },
  ]]));
const missing = Array.from({ length: 42 }, (_, i) => `e${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`);
const buys = { dear: "f00000001-0000-4000-8000-000000000000", spare: "f00000002-0000-4000-8000-000000000000", missing };

function build(seed = "wren-calloway-v1") {
  const catalog = fakeCatalog();
  const { owned, commanders } = assembleOwned(catalog, streamFor("collection", seed), new Set([buys.dear, buys.spare, ...missing]));
  const rows = assignPrintings(owned, printingsFor([...owned.keys()]), streamFor("printings", seed));
  // Every commander indexes the first 2,500 cards, so a card can fit several decks.
  const support = new Map<string, Map<string, number>>();
  for (const c of commanders) support.set(c.oracleId, new Map(catalog.cards.slice(0, 2500).map((k, i) => [k.oracleId, 2500 - i])));
  const plan = planDecks(catalog, owned, commanders.slice(0, 24), support, buys);
  return { catalog, owned, commanders, rows, plan };
}

describe("ids", () => {
  it("makes version-5 uuids that depend only on the name", () => {
    expect(uuidV5("deck:played")).toBe(uuidV5("deck:played"));
    expect(uuidV5("deck:played")).not.toBe(uuidV5("deck:under"));
    expect(uuidV5("x")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
  it("pins the deck ids: changing them breaks every stored capture and demo payload", () => {
    expect(ABOUT_DECK_IDS).toEqual({
      under: "3365a387-a06a-5632-8318-3b59ac200034",
      over: "251a8f5c-6824-50e1-b6e4-5d330105edae",
      played: "3237a80d-7485-52dd-b69e-31acda7dd9ef",
      fresh: "278a4021-bdd2-521f-a659-d9f17ab6b34a",
      versioned: "26c50a39-4b44-5802-ba34-3a6a0fc2fcc6",
    });
    expect(new Set(Object.values(ABOUT_DECK_IDS)).size).toBe(DECK_ROLES.length);
  });
  it("mulberry32 repeats for a seed and differs across seeds", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(mulberry32(8)()).not.toBe(mulberry32(7)());
  });
});

describe("the fictional collection", () => {
  it("is the same for the same seed and catalog, and different for another seed", () => {
    expect(collectionFingerprint(build().rows)).toBe(collectionFingerprint(build().rows));
    expect(collectionFingerprint(build("another-seed").rows)).not.toBe(collectionFingerprint(build().rows));
  });
  it("holds about 3,000 cards, 40 commanders, real printings and a fixed foil share", () => {
    const { rows, commanders, owned } = build();
    expect(owned.size).toBe(TARGETS.rows);
    expect(rows.length).toBeGreaterThanOrEqual(TARGETS.rows);
    expect(commanders).toHaveLength(ARCHETYPES.length * TARGETS.commandersPerArchetype);
    const foil = rows.filter((r) => r.finish === "foil").length / rows.length;
    expect(foil).toBeGreaterThan(0.06);
    expect(foil).toBeLessThan(0.16);
    for (const r of rows) expect(r.scryfallId).toMatch(/^[0-9a-f-]{36}$/);
  });
  it("never owns a card the decks are missing", () => {
    const { owned } = build();
    for (const id of [buys.dear, buys.spare, ...missing]) expect(owned.has(id)).toBe(false);
  });
});

describe("the fictional decks", () => {
  it("builds each deck to its size, from owned cards only, and no copy is claimed twice", () => {
    const { plan, owned } = build();
    const used = new Map<string, number>();
    for (const d of plan.decks) {
      const total = [...d.rows.values()].reduce((a, b) => a + b, 0);
      expect(total).toBe(d.role === "played" ? DECK_SIZES.played.size + 2 : DECK_SIZES[d.role].size);
      expect(d.name).toBe(DECK_NAMES[d.role]);
      for (const [id, n] of d.rows) {
        if ([buys.dear, buys.spare, ...missing].includes(id)) continue;
        used.set(id, (used.get(id) ?? 0) + n);
      }
      used.set(d.commander.oracleId, (used.get(d.commander.oracleId) ?? 0) + 1);
    }
    const basics = new Set(["b00000001", "b00000002", "b00000003", "b00000004", "b00000005"].map((p) => `${p}-0000-4000-8000-000000000000`));
    for (const [id, n] of used) if (!basics.has(id)) expect(n).toBeLessThanOrEqual(owned.get(id) ?? 0);
    for (const s of [plan.playedSwap, ...plan.versionedSwaps]) expect(owned.has(s.in)).toBe(true);
  });
  it("totals as the profile counts it: Played exactly 100, one deck under (Top off) and one over (Look deeper)", () => {
    const { plan } = build();
    const total = Object.fromEntries(plan.decks.map((d) => [d.role, planTotal(d)]));
    expect(total.played).toBe(100);
    expect(total.under).toBeLessThan(100);
    expect(total.over).toBeGreaterThan(100);
    expect(total).toEqual({ under: 88, over: 106, played: 100, fresh: 100, versioned: 100 });
  });
  it("leaves one owned card that fits two or more decks and is in none of them", () => {
    const { plan, owned } = build();
    const { oracleId, fits } = plan.sharedCard;
    expect(owned.has(oracleId)).toBe(true);
    expect(fits.length).toBeGreaterThanOrEqual(2);
    for (const d of plan.decks) {
      expect(d.rows.has(oracleId)).toBe(false);
      expect(d.commander.oracleId).not.toBe(oracleId);
    }
    expect([plan.playedSwap.in, ...plan.versionedSwaps.map((s) => s.in)]).not.toContain(oracleId);
  });
  it("marks and locks only cards the account owns, never the unowned buys", () => {
    const { plan, owned } = build();
    const unowned = new Set([buys.dear, buys.spare, ...missing]);
    expect(plan.markedCard).not.toBeNull();
    for (const id of [plan.markedCard!, plan.lockedCard]) {
      expect(owned.has(id)).toBe(true);
      expect(unowned.has(id)).toBe(false);
    }
  });
  it("is the same for the same seed", () => {
    const a = build().plan.decks.map((d) => [d.role, d.commander.oracleId, [...d.rows]]);
    const b = build().plan.decks.map((d) => [d.role, d.commander.oracleId, [...d.rows]]);
    expect(a).toEqual(b);
  });
});

describe("the extras (history and proxies) leave the five decks alone", () => {
  it("keeps the five deck ids, role sizes and card totals a paid demo was generated from", () => {
    const { plan } = build();
    expect(Object.fromEntries(DECK_ROLES.map((r) => [r, ABOUT_DECK_IDS[r]]))).toEqual({
      under: "3365a387-a06a-5632-8318-3b59ac200034",
      over: "251a8f5c-6824-50e1-b6e4-5d330105edae",
      played: "3237a80d-7485-52dd-b69e-31acda7dd9ef",
      fresh: "278a4021-bdd2-521f-a659-d9f17ab6b34a",
      versioned: "26c50a39-4b44-5802-ba34-3a6a0fc2fcc6",
    });
    expect(Object.fromEntries(plan.decks.map((d) => [d.role, planTotal(d)]))).toEqual({ under: 88, over: 106, played: 100, fresh: 100, versioned: 100 });
  });
  it("puts proxy marks on a deck other than Played, on cards the deck already holds, never a basic or the commander", () => {
    expect(PROXY_DECK_ROLE).not.toBe("played");
    const { plan, catalog } = build();
    const deck = plan.decks.find((d) => d.role === (PROXY_DECK_ROLE ?? "versioned"))!;
    const basics = new Set(Object.values(catalog.basics));
    const picks = pickProxyCards(deck.rows, deck.commander.oracleId, basics);
    expect(picks).toHaveLength(3);
    for (const id of picks) {
      expect(deck.rows.get(id)).toBe(1);
      expect(basics.has(id)).toBe(false);
      expect(id).not.toBe(deck.commander.oracleId);
    }
    expect(pickProxyCards(deck.rows, deck.commander.oracleId, basics)).toEqual(picks);
  });
});

describe("no real identity", () => {
  it("uses only invented names", () => {
    const text = JSON.stringify({ PLAYER_NAME, FRIEND_NAMES, DECK_NAMES }).toLowerCase();
    for (const real of ["hugh", "hartigan", "huey", "gmail"]) expect(text).not.toContain(real);
    expect(PLAYER_NAME).toBe("Wren Calloway");
  });
});

describe("the friends' faces", () => {
  const rows = Array.from({ length: FACE_COUNT }, (_, i) => ({ oracleId: `a${i}` }));
  const fake = (async () => rows) as unknown as FixtureSql;
  it("are one list of distinct commanders: Alex's three, then the four cart friends, with no overlap", async () => {
    const faces = await readFaces(fake, "user_x");
    expect(new Set(faces).size).toBe(FACE_COUNT);
    expect(faces.slice(0, 3).some((f) => faces.slice(3, 7).includes(f))).toBe(false);
  });
  it("refuses a catalog too thin to give every friend his own", async () => {
    await expect(readFaces((async () => rows.slice(1)) as unknown as FixtureSql, "user_x")).rejects.toThrow(/faces/);
  });
});
