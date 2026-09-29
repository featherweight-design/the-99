import { describe, expect, it } from "vitest";

import { cutToWindow, decodeDiscovery, DRAW_KEYS, drawFieldsFor, encodeDiscovery, isDrawn } from "./encode";
import type { GapSlot } from "../edhrec/gap-slot";
import type { DiscoveryItem, DiscoveryList } from "./list";

const baseItem: DiscoveryItem = {
  slug: "atraxa-praetors-voice",
  name: "Atraxa, Praetors' Voice",
  colorIdentity: ["W", "U", "B", "G"],
  artCropUri: "https://cards.scryfall.io/art_crop/front/0/d/0d-atraxa.jpg",
  releasedAt: "2016-11-11",
  deckCount: 41_233,
  rank: 1,
  price: { kind: "priced", cents: 1499 },
  prose: "Atraxa decks tend to grind value out of counters.",
  gapSlot: { kind: "unplayed", labels: ["Counters", "Proliferate"] },
  score: 58,
  measurableTotal: 100,
  fitPool: 12,
  fitRoles: 20,
  fitSynergy: 26,
};

function listOf(items: DiscoveryItem[]): DiscoveryList {
  return {
    items,
    candidateCount: 12,
    cardsRead: 2733,
    freePoolSize: 2733,
    bestPct: 27,
    floorExcluded: 3,
    poolExcluded: 0,
    unmeasured: 1,
    hasDecks: true,
    availOk: true,
  priceOk: true,
    deckIdentities: [["W", "U"], []],
    sort: "new",
  };
}

function roundTrip(list: DiscoveryList) {
  return decodeDiscovery(encodeDiscovery(list));
}

describe("encodeDiscovery", () => {
  it("round-trips a whole list", () => {
    const list = listOf([baseItem]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips a null art crop", () => {
    const list = listOf([{ ...baseItem, artCropUri: null }]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips an art crop on a foreign host", () => {
    const list = listOf([
      { ...baseItem, artCropUri: "https://example.test/art_crop/front/x.jpg" },
    ]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips an art crop under a scheme that is not http", () => {
    const list = listOf([{ ...baseItem, artCropUri: "ipfs://QmArt/front/x.jpg" }]);
    expect(roundTrip(list)).toEqual(list);
  });

  // The nearest deck, the label list and the role tuple all left the item with
  // the composition that drew them, and their round-trip cases with them. The
  // gap slot's own three members are covered above, which is the encoder's only
  // remaining nested shape.

  it("round-trips null figures", () => {
    const list = listOf([{ ...baseItem, releasedAt: null, deckCount: null }]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips every price slot", () => {
    const list = listOf([
      { ...baseItem, price: { kind: "priced", cents: 0 } },
      { ...baseItem, slug: "b", price: { kind: "notStocked" } },
      { ...baseItem, slug: "c", price: { kind: "absent" } },
    ]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("round-trips an empty list", () => {
    const list = listOf([]);
    expect(roundTrip(list)).toEqual(list);
  });

  it("files a label shared by two rows once", () => {
    const twin = { ...baseItem, slug: "twin", name: "Twin" };
    const encoded = encodeDiscovery(listOf([baseItem, twin]));

    // The GAP SLOT's labels are the dictionary's only source now: the tag list
    // and the nearest deck's shared list left with the composition. Two rows
    // naming the same mechanic file it once, which is the whole point of the
    // table.
    expect(encoded.strings.filter((x) => x === "Counters")).toHaveLength(1);
    expect(encoded.strings.filter((x) => x === "Proliferate")).toHaveLength(1);
    expect(roundTrip(listOf([baseItem, twin]))).toEqual(listOf([baseItem, twin]));
  });

  // ALL THREE MEMBERS. `noMechanics` encodes as a one-element tuple and has to
  // rebuild WITHOUT a `labels` key rather than with an empty array — `toEqual`
  // treats a missing key and `undefined` alike, so the shape is read
  // separately. `allPlayed` now carries labels AND `capped`, which is a third
  // tuple slot and the one a v6 payload does not have.
  it.each<GapSlot>([
    { kind: "unplayed", labels: ["Counters", "Proliferate"] },
    { kind: "allPlayed", labels: ["Group Hug", "Politics"], capped: true },
    { kind: "allPlayed", labels: ["Group Hug"], capped: false },
    { kind: "noMechanics" },
  ])("round-trips the $kind gap slot", (gapSlot) => {
    const list = listOf([{ ...baseItem, gapSlot }]);

    // A whole row, not a withheld one, so every draw field is present.
    const back = roundTrip(list).items[0].gapSlot!;
    expect(back).toEqual(gapSlot);
    expect(Object.hasOwn(back, "labels")).toBe(gapSlot.kind !== "noMechanics");
    // `capped` survives as a BOOLEAN, not as the 1/0 it travels as: the wire
    // form is an encoding detail and a reader taking `1` as truthy would pass
    // this while handing the copy a number.
    if (gapSlot.kind === "allPlayed") {
      expect((back as { capped: unknown }).capped).toBe(gapSlot.capped);
    }
  });

  // The labels come from the same theme vocabulary the rest of the payload
  // draws on, so a gap label already filed by another field costs an index.
  it("files a gap label into the shared dictionary", () => {
    const encoded = encodeDiscovery(
      listOf([{ ...baseItem, gapSlot: { kind: "unplayed", labels: ["Counters"] } }]),
    );

    expect(encoded.strings.filter((x) => x === "Counters")).toHaveLength(1);
    const row = encoded.rows[0] as unknown[];
    const [, labels] = row[encoded.keys.indexOf("gapSlot")] as [number, number[]];
    expect(labels).toEqual([encoded.strings.indexOf("Counters")]);
  });

  // The sentence is deliberately NOT filed: every one is distinct, so a
  // dictionary would hold 3,000 entries referenced once each and add the
  // indices on top of the same bytes.
  it("leaves the play-style sentence out of the dictionary", () => {
    const prose = "Atraxa decks tend to grind value out of counters.";
    const encoded = encodeDiscovery(listOf([{ ...baseItem, prose }]));

    expect(encoded.strings).not.toContain(prose);
    const row = encoded.rows[0] as unknown[];
    expect(row[encoded.keys.indexOf("prose")]).toBe(prose);
  });

  // A decoder reads the order the payload was written with, never this module's
  // current constant — the same rule `keys` and `roles` follow. Written as a
  // payload whose kinds are REVERSED: read against `GAP_KINDS` it would decode
  // as `unplayed`, which is a different state the row draws differently.
  //
  // `noMechanics` SPECIFICALLY, never the middle member. Reversing a
  // three-element array leaves index 1 where it was, so an `allPlayed` fixture
  // decodes correctly whichever array is consulted — the first version of this
  // case used it and PASSED the mutation it exists to catch.
  it("decodes a gap slot against the payload's own kind order", () => {
    const encoded = encodeDiscovery(listOf([{ ...baseItem, gapSlot: { kind: "noMechanics" } }]));
    const at = encoded.keys.indexOf("gapSlot");
    const reordered = {
      ...encoded,
      gapKinds: [...encoded.gapKinds].reverse(),
      rows: encoded.rows.map((row) => {
        const copy = [...row];
        const [kindAt] = copy[at] as [number];
        copy[at] = [encoded.gapKinds.length - 1 - kindAt];
        return copy;
      }),
    };

    expect(decodeDiscovery(reordered).items[0].gapSlot).toEqual({ kind: "noMechanics" });
  });

  it("drops the art host from a Scryfall crop", () => {
    const encoded = encodeDiscovery(listOf([baseItem]));
    const row = encoded.rows[0] as unknown[];

    expect(row[encoded.keys.indexOf("artCropUri")]).toBe("0/d/0d-atraxa.jpg");
  });
});

describe("cutToWindow / drawFieldsFor (list payload plan, PR 3)", () => {
  const a = { ...baseItem, slug: "a", name: "A" };
  const b = { ...baseItem, slug: "b", name: "B", prose: "Another sentence." };
  const encoded = encodeDiscovery(listOf([a, b]));

  it("ships the kept rows whole and the rest without a single draw field", () => {
    const [kept, cut] = decodeDiscovery(cutToWindow(encoded, new Set(["a"]))).items;
    expect(kept).toEqual(a);
    expect(isDrawn(kept)).toBe(true);
    expect(isDrawn(cut)).toBe(false);
    expect(cut).toEqual({
      slug: "b", name: "B", colorIdentity: b.colorIdentity, releasedAt: b.releasedAt, deckCount: b.deckCount,
    });
    for (const key of DRAW_KEYS) expect(Object.hasOwn(cut, key)).toBe(false);
  });

  it("leaves the cached entry it was given untouched", () => {
    const before = JSON.stringify(encoded);
    cutToWindow(encoded, new Set());
    expect(JSON.stringify(encoded)).toBe(before);
  });

  it("answers the draw fields of the rows named, and nothing for a slug not in the list", () => {
    const fields = drawFieldsFor(encoded, new Set(["b", "not-here"]));
    expect(Object.keys(fields)).toEqual(["b"]);
    expect({ ...decodeDiscovery(cutToWindow(encoded, new Set())).items[1], ...fields.b }).toEqual(b);
  });
});
