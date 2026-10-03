import { describe, expect, it } from "vitest";
import type { Availability } from "../decks/availability";
import type { BrowseListCard } from "./browse";
import {
  COLLECTION_DRAW_KEYS,
  collectionDrawFieldsFor,
  cutCollectionWindow,
  decodeCollection,
  encodeCollection,
  isCollectionDrawn,
  stemImage,
  unstemImage,
} from "./list-wire";

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
const full = (claims: ReturnType<typeof claim>[]): Availability => ({
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

  it("names each deck once, however many cards it claims", () => {
    const wire = encodeCollection(cards, availability);
    expect(wire.decks).toEqual([["d1", "Izzet Spells"], ["d2", "Brew"]]);
    expect(wire.cards[1].availability?.claims).toEqual([1]);
    expect(wire.cards[0].imageUri).toBe(`${ID}?1783920591`);
  });

  it("ships none of the claim fields a marker does not read", () => {
    const text = JSON.stringify(encodeCollection(cards, availability));
    for (const field of ["senior", "since", "versionNumber", "pending", "commander"]) {
      expect(text).not.toContain(`"${field}"`);
    }
  });

  it("reads a card with no reading as null, not as free", () => {
    expect(decodeCollection(encodeCollection(cards, null)).every((c) => c.availability === null)).toBe(true);
  });
});

describe("cutCollectionWindow / collectionDrawFieldsFor (list payload plan, PR 4)", () => {
  const kept = card("a", { facts: ["gameChanger"], comboPartner: { name: "Card b" }, comboOtherPartners: 2 });
  const cut = card("b", { imageUri: null, facts: [], comboPartner: { name: "Card a" } });
  const wire = encodeCollection([kept, cut], null);

  it("ships the window's cards whole and the rest without a single draw field", () => {
    const [a, b] = decodeCollection(cutCollectionWindow(wire, new Set(["a"])));
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
    const [, b] = decodeCollection(cutCollectionWindow(wire, new Set(["a", "b"])));
    expect(isCollectionDrawn(b)).toBe(true);
    expect(b.imageUri).toBeNull();
  });

  it("leaves the wire it was given untouched", () => {
    const before = JSON.stringify(wire);
    cutCollectionWindow(wire, new Set());
    expect(JSON.stringify(wire)).toBe(before);
  });

  it("answers the draw fields of the cards named, and nothing for an id not in the list", () => {
    const fields = collectionDrawFieldsFor([kept, cut], new Set(["b", "not-here"]));
    expect(Object.keys(fields)).toEqual(["b"]);
    const [, withheld] = decodeCollection(cutCollectionWindow(wire, new Set()));
    const { art, ...draw } = fields.b;
    expect({ ...draw, ...withheld, withheld: undefined }).toEqual({ ...cut, availability: null, withheld: undefined });
    // And the caption the art was resolved with, read off the same card.
    expect(art).toEqual({ printedName: cut.printedName, primarySetCode: cut.primarySetCode });
  });
});
