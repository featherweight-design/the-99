import { gzipSync } from "node:zlib";
import { fromColumns } from "../cache/columns";
import { describe, expect, it } from "vitest";
import type { Availability } from "../decks/availability";
import type { BrowseListCard } from "./browse";
import {
  COLLECTION_DRAW_KEYS,
  collectionDrawFieldsFor,
  decodeCollection,
  encodeCollection,
  packCollection,
  unpackCollection,
  isCollectionDrawn,
  stemImage,
  unstemImage,
} from "./list-wire";

type WireRow = { a?: unknown[]; imageUri?: string; p?: number; ad?: number; sn?: number };
const ID = "c1466ae6-9dbc-4ea3-9f6e-3f5d0a1b2c3d";
const URL = `https://cards.scryfall.io/normal/front/c/1/${ID}.jpg?1783920591`;

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

/** A full reading, carrying the claim fields only a deck surface reads. */
const claim = (id: string, name: string, mature: boolean) => ({
  id, name, mature, quantity: 1, pending: false, commander: false, senior: true, since: 3, versionNumber: 2,
});
const full = (claims: (ReturnType<typeof claim> & { granted?: number })[]): Availability => ({
  owned: 2, hard: claims.filter((c) => c.mature).length, soft: claims.filter((c) => !c.mature).length,
  free: 1, claims,
});

describe("stemImage / unstemImage", () => {
  it("round-trips a Scryfall normal URL through its id and stamp", () => {
    expect(stemImage(URL)).toBe(`${ID}?1783920591`);
    expect(unstemImage(stemImage(URL))).toBe(URL);
  });

  it("keeps a URL with no stamp", () => {
    const bare = URL.replace(/\?\d+$/, "");
    expect(stemImage(bare)).toBe(ID);
    expect(unstemImage(stemImage(bare))).toBe(bare);
  });

  it("leaves any other URL whole, including one whose path letters are not its id's", () => {
    for (const other of [
      "https://example.com/art.jpg",
      `https://cards.scryfall.io/large/front/c/1/${ID}.jpg?1`,
      `https://cards.scryfall.io/normal/front/d/1/${ID}.jpg?1`,
      `http://cards.scryfall.io/normal/front/c/1/${ID}.jpg?1`,
      "/art/local.jpg",
      "data:image/png;base64,AAAA",
    ]) {
      expect(stemImage(other)).toBe(other);
      expect(unstemImage(stemImage(other))).toBe(other);
    }
  });
});

describe("encodeCollection / decodeCollection", () => {
  const cards = [
    card("a"),
    card("b", { imageUri: null, comboPartner: { name: "Card c" } }),
    card("c", { imageUri: "https://example.com/art.jpg" }),
  ];
  const availability = new Map<string, Availability>([
    ["a", full([claim("d1", "Izzet Spells", true), claim("d2", "Brew", false)])],
    ["b", full([claim("d1", "Izzet Spells", true)])],
  ]);

  it("gives back every card as it went in, with each claim's deck and sleeved bit", () => {
    const decoded = decodeCollection(encodeCollection(cards, availability));
    expect(decoded).toEqual([
      { ...cards[0], availability: { owned: 2, hard: 1, soft: 1, free: 1, claims: [
        { id: "d1", name: "Izzet Spells", mature: true },
        { id: "d2", name: "Brew", mature: false },
      ] } },
      { ...cards[1], availability: { owned: 2, hard: 1, soft: 0, free: 1, claims: [
        { id: "d1", name: "Izzet Spells", mature: true },
      ] } },
      { ...cards[2], availability: null },
    ]);
  });

  // The claim bit is `holdsCopy`: a brew the player gave a copy to decodes as holding it, so the
  // `/collection` marker names it. An ungranted brew stays unsleeved (the case above).
  it("decodes a brew given a copy as holding it", () => {
    const granted = new Map<string, Availability>([
      ["a", full([claim("d1", "Izzet Spells", true), { ...claim("d2", "Brew", false), granted: 1 }])],
    ]);
    const decoded = decodeCollection(encodeCollection([cards[0]], granted));
    expect(decoded[0].availability?.claims).toEqual([
      { id: "d1", name: "Izzet Spells", mature: true },
      { id: "d2", name: "Brew", mature: true },
    ]);
  });

  it("names each deck once, however many cards it claims", () => {
    const wire = encodeCollection(cards, availability);
    expect(wire.decks).toEqual([["d1", "Izzet Spells"], ["d2", "Brew"]]);
    const rows = fromColumns<WireRow>(wire.cards);
    expect(rows[1].a?.[4]).toEqual([1]);
    expect(rows[0].imageUri).toBe(`${ID}?1783920591`);
  });

  it("ships availability as a short-keyed tuple, and none at all for a card with none", () => {
    const wire = encodeCollection(cards, availability);
    const rows = fromColumns<WireRow>(wire.cards);
    expect(rows[0].a).toEqual([2, 1, 1, 1, [1, 2]]);
    expect(Object.hasOwn(rows[2], "a")).toBe(false);
    expect(JSON.stringify(wire)).not.toContain('"availability"');
  });

  it("ships none of the claim fields a marker does not read", () => {
    const text = JSON.stringify(encodeCollection(cards, availability));
    for (const field of ["senior", "since", "versionNumber", "pending", "commander"]) {
      expect(text).not.toContain(`"${field}"`);
    }
  });

  it("carries a card's price and Date added figures under short keys, and back", () => {
    const dated = [card("a", { price: 120, added: 29_000_000, since: 20_700 }), card("b", { added: 29_000_001 }), card("c")];
    const wire = encodeCollection(dated, null);
    const rows = fromColumns<WireRow>(wire.cards);
    expect(rows[0]).toMatchObject({ p: 120, ad: 29_000_000, sn: 20_700 });
    expect(rows[2]).not.toHaveProperty("ad");
    expect(rows[2]).not.toHaveProperty("sn");
    const text = JSON.stringify(wire);
    expect(text).not.toContain('"added"');
    expect(text).not.toContain('"since"');
    const back = decodeCollection(wire);
    expect(back[0]).toMatchObject({ price: 120, added: 29_000_000, since: 20_700 });
    expect(back[1]).toMatchObject({ added: 29_000_001 });
    expect(back[1]).not.toHaveProperty("since");
    expect(back[2]).not.toHaveProperty("added");
  });

  it("reads a card with no reading as null, not as free", () => {
    expect(decodeCollection(encodeCollection(cards, null)).every((c) => c.availability === null)).toBe(true);
  });
});

describe("the first window / collectionDrawFieldsFor (list payload plan, PR 4)", () => {
  const kept = card("a", { facts: ["gameChanger"], comboPartner: { name: "Card b" }, comboOtherPartners: 2 });
  const cut = card("b", { imageUri: null, facts: [], comboPartner: { name: "Card a" } });
  const cut_ = (keep: string[]) => encodeCollection([kept, cut], null, new Set(keep));

  it("ships the window's cards whole and the rest without a single draw field", () => {
    const [a, b] = decodeCollection(cut_(["a"]));
    expect(isCollectionDrawn(a)).toBe(true);
    expect(a).toEqual({ ...kept, availability: null });
    expect(isCollectionDrawn(b)).toBe(false);
    for (const key of COLLECTION_DRAW_KEYS) expect(Object.hasOwn(b, key)).toBe(false);
    // Everything a filter, a search or a sort reads is still there.
    expect(b).toMatchObject({ oracleId: "b", name: "Card b", typeLine: "Instant", setCounts: [["RTR", 1]], quantity: 1 });
  });

  // A NULL image is a drawn card with no art, never a withheld one: the mark comes from the
  // key's presence, so a card whose catalog row has no picture is not asked for again forever.
  it("reads a whole card with no art as drawn", () => {
    const [, b] = decodeCollection(cut_(["a", "b"]));
    expect(isCollectionDrawn(b)).toBe(true);
    expect(b.imageUri).toBeNull();
  });

  it("leaves the cards it was given untouched", () => {
    const before = JSON.stringify([kept, cut]);
    cut_([]);
    expect(JSON.stringify([kept, cut])).toBe(before);
  });

  it("answers the draw fields of the cards named, and nothing for an id not in the list", () => {
    const fields = collectionDrawFieldsFor([kept, cut], new Set(["b", "not-here"]));
    expect(Object.keys(fields)).toEqual(["b"]);
    const [, withheld] = decodeCollection(cut_([]));
    const { art, ...draw } = fields.b;
    expect({ ...draw, ...withheld, withheld: undefined }).toEqual({ ...cut, availability: null, withheld: undefined });
    // And the caption the art was resolved with, read off the same card.
    expect(art).toEqual({ printedName: cut.printedName, primarySetCode: cut.primarySetCode });
  });
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
