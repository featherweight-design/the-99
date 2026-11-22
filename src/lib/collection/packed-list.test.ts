import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import type { BrowseListCard } from "./browse";
import { packCollection, unpackCollection } from "./packed-list";

const URL = "https://cards.scryfall.io/normal/front/c/1/c1466ae6-9dbc-4ea3-9f6e-3f5d0a1b2c3d.jpg?1783920591";

const card = (oracleId: string, over: Partial<BrowseListCard> = {}): BrowseListCard => ({
  oracleId,
  name: `Card ${oracleId}`,
  typeLine: "Instant",
  manaCost: "{U}",
  rarity: "rare",
  colorIdentity: ["U"],
  imageUri: URL,
  printedName: null,
  quantity: 1,
  setCounts: [["RTR", 1]],
  primarySetCode: "RTR",
  ...over,
});

describe("packCollection / unpackCollection (the cached entry)", () => {
  it("round-trips every card whole, null art included", () => {
    const list = [
      card("a", { facts: ["gameChanger"], comboPartner: { name: "Card b" }, price: 120 }),
      card("b", { imageUri: null }),
    ];
    expect(unpackCollection(packCollection(list))).toEqual(list.map((c) => ({ ...c, availability: null })));
  });

  // The data cache refuses an entry over 2 MiB and then reruns the loader on every request. A
  // maximal collection (about 24,000 unique cards) is what that happens to: as plain rows, or as
  // gzipped rows (the entry before the columnar one), it is over the limit; as columns under
  // brotli it is under. The cards are synthetic but carry the shape that costs the bytes: a
  // random id and art UUID per card, a name, a type line, set counts, a price.
  it("holds a 24,000-card collection under the data cache's 2 MiB limit", () => {
    let seed = 7;
    const rand = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
    };
    const hex = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join("");
    const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-a${hex(3)}-${hex(12)}`;
    const words = Array.from({ length: 4000 }, () => hex(3 + Math.floor(rand() * 6)));
    const word = () => words[Math.floor(rand() * words.length)];
    const types = ["Creature — Elf Warrior", "Instant", "Sorcery", "Artifact", "Land", "Enchantment — Aura"];
    const sets = ["RTR", "M21", "ZNR", "MH2", "CMR", "ELD", "KHM", "NEO"];
    const list = Array.from({ length: 24_000 }, () => {
      const art = uuid();
      return card(uuid(), {
        name: `${word()} ${word()} of ${word()}`,
        typeLine: types[Math.floor(rand() * types.length)],
        manaCost: rand() < 0.2 ? null : `{${1 + Math.floor(rand() * 5)}}{${"WUBRG"[Math.floor(rand() * 5)]}}`,
        imageUri: `https://cards.scryfall.io/normal/front/${art[0]}/${art[1]}/${art}.jpg?${1_600_000_000 + Math.floor(rand() * 200_000_000)}`,
        setCounts: [[sets[Math.floor(rand() * sets.length)], 1 + Math.floor(rand() * 3)]],
        price: Math.floor(rand() * 5000),
        quantity: 1 + Math.floor(rand() * 4),
      });
    });
    const LIMIT = 2 * 1024 * 1024;
    // The old entry: gzipped rows, base64, JSON-quoted. Over the limit, so this list was never cached.
    expect(JSON.stringify(gzipSync(JSON.stringify(list)).toString("base64")).length).toBeGreaterThan(LIMIT);
    const packed = packCollection(list);
    expect(JSON.stringify(packed).length).toBeLessThan(LIMIT);
    expect(unpackCollection(packed)).toHaveLength(24_000);
  });
});
