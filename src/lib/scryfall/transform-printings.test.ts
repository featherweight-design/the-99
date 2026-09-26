import { describe, expect, it } from "vitest";
import {
  classifyPrinting,
  compareForRepresentative,
  pickRepresentative,
  type PrintingRow,
} from "./transform-printings";

const plains = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  oracle_id: "bbbbbbbb-0000-0000-0000-000000000001",
  name: "Plains",
  layout: "normal",
  set: "ECL",
  collector_number: "269",
  finishes: ["nonfoil", "foil"],
  border_color: "black",
  image_uris: {
    normal: "https://cards.scryfall.io/normal/plains.jpg",
    small: "https://cards.scryfall.io/small/plains.jpg",
    art_crop: "https://cards.scryfall.io/art_crop/plains.jpg",
  },
};

const asPrinting = (raw: Record<string, unknown>): PrintingRow => {
  const result = classifyPrinting(raw);
  if (result.kind !== "printing") throw new Error(`expected a printing, got ${result.kind}`);
  return result.row;
};

const printing = (over: Partial<PrintingRow>): PrintingRow => ({
  scryfallId: "id", oracleId: "o", setCode: "ecl", collectorNumber: "1",
  imageUri: null, imageUriSmall: null, artCropUri: null, backImageUri: null,
  finishes: ["nonfoil"], isVariant: false,
  flavorName: null, booster: false, rarity: "common", ...over,
});

describe("classifyPrinting", () => {
  it("maps a default_cards entry to a printings row", () => {
    expect(asPrinting(plains)).toEqual({
      scryfallId: "aaaaaaaa-0000-0000-0000-000000000001",
      oracleId: "bbbbbbbb-0000-0000-0000-000000000001",
      backImageUri: null,
      setCode: "ecl",
      collectorNumber: "269",
      imageUri: "https://cards.scryfall.io/normal/plains.jpg",
      imageUriSmall: "https://cards.scryfall.io/small/plains.jpg",
      // THIS printing's crop, not the oracle row's. A deck's commander band drew
      // `cards.art_crop_uri` — one arbitrary printing's art — until this column existed.
      artCropUri: "https://cards.scryfall.io/art_crop/plains.jpg",
      finishes: ["nonfoil", "foil"],
      isVariant: false,
      flavorName: null,
      booster: null,
      rarity: null,
    });
  });

  it("carries a Secret Lair printing's flavor name (#467)", () => {
    // The name printed on the card: the only name a player holding it can type.
    const sld = { ...plains, name: "Iroas, God of Victory", set: "SLD", collector_number: "2215",
      flavor_name: "Freya, Queen of the Valkyries" };
    expect(asPrinting(sld)).toMatchObject({
      flavorName: "Freya, Queen of the Valkyries",
      setCode: "sld",
    });
  });

  it("keeps a non-English printing — default_cards is already language-deduped", () => {
    // The 4 Japanese alt-art Neo lands in the real collection would vanish under a lang filter.
    expect(asPrinting({ ...plains, lang: "ja" }).setCode).toBe("ecl");
  });

  it("falls back to card_faces images for a DFC with no top-level image_uris", () => {
    const dfc = {
      ...plains, layout: "transform", image_uris: undefined,
      card_faces: [
        { image_uris: { normal: "https://x/front.jpg", small: "https://x/front-s.jpg",
                        art_crop: "https://x/front-crop.jpg" } },
        { image_uris: { normal: "https://x/back.jpg", small: "https://x/back-s.jpg",
                        art_crop: "https://x/back-crop.jpg" } },
      ],
    };
    expect(asPrinting(dfc)).toMatchObject({
      imageUri: "https://x/front.jpg",
      imageUriSmall: "https://x/front-s.jpg",
      // The front face's crop, for the same reason the front face's image is taken: a
      // two-sided layout carries no top-level `image_uris`, and without the fallback every
      // DFC printing would store a null crop and keep drawing the oracle row's art.
      artCropUri: "https://x/front-crop.jpg",
      // This printing's own second side, which is what makes a flip show the art of the
      // printing the reader picked rather than whichever one the oracle row was built from.
      backImageUri: "https://x/back.jpg",
    });
  });

  // Split, flip and adventure cards are `card_faces` arrays too, and they print both halves
  // on one piece of stock — so the second face carries no image and there is nothing to
  // turn to. Asking the face rather than the layout is what keeps this list of names out
  // of the transform.
  it("gives a one-sided layout no back face, however many faces it lists", () => {
    const split = {
      ...plains, layout: "split",
      card_faces: [{ name: "Fire" }, { name: "Ice" }],
    };
    expect(asPrinting(split).backImageUri).toBeNull();
    expect(asPrinting({ ...plains, card_faces: undefined }).backImageUri).toBeNull();
  });

  it("stores no crop when neither the printing nor its faces carry one", () => {
    // Every row an older ingest wrote is in this state until the catalog is re-seeded,
    // and the reader has to fall back to the oracle-level crop for all of them.
    expect(asPrinting({ ...plains, image_uris: { normal: "n.jpg" } }).artCropUri).toBeNull();
  });

  it("uses the first face that carries an image", () => {
    const dfc = {
      ...plains, layout: "modal_dfc", image_uris: undefined,
      card_faces: [{ name: "front" }, { image_uris: { normal: "https://x/back.jpg" } }],
    };
    expect(asPrinting(dfc)).toMatchObject({
      imageUri: "https://x/back.jpg", imageUriSmall: null,
    });
  });

  it("routes token/emblem/art-series layouts to the skipped ledger", () => {
    for (const layout of ["token", "double_faced_token", "emblem", "art_series"]) {
      const result = classifyPrinting({ ...plains, layout });
      expect(result).toEqual({
        kind: "skipped-layout",
        row: { scryfallId: plains.id, layout, name: "Plains" },
      });
    }
  });

  // A printing of a layout `toCardRow` skips has no FK target, so it goes to the ledger too.
  // The ledger keeps its layout, and `loadMatchInputs` reports only the token layouts as skipped.
  it("routes the other layouts that are not cards to the skipped ledger", () => {
    for (const layout of ["front_card", "planar", "scheme", "vanguard", "host", "augment"]) {
      expect(classifyPrinting({ ...plains, layout })).toEqual({
        kind: "skipped-layout",
        row: { scryfallId: plains.id, layout, name: "Plains" },
      });
    }
  });

  it("routes a normal printing whose type line names no card type to the skipped ledger", () => {
    for (const type_line of ["Card", "Stickers"]) {
      expect(classifyPrinting({ ...plains, layout: "normal", type_line })).toEqual({
        kind: "skipped-layout",
        row: { scryfallId: plains.id, layout: "normal", name: "Plains" },
      });
    }
  });

  // The shape of Scryfall's `sld/2214` — Hugh's foil, and the printing this layout used to
  // deny the catalog. Its top level carries no oracle id, no art and no flavor name; all
  // three sit on the faces, and the front face's name is the one printed on the card.
  const reversible = {
    id: "b83edc5c-ee6b-4c75-94b2-46d1f68f7304",
    name: "Teferi's Ageless Insight // Teferi's Ageless Insight",
    layout: "reversible_card",
    set: "SLD",
    collector_number: "2214",
    finishes: ["foil"],
    card_faces: [
      {
        name: "Teferi's Ageless Insight",
        flavor_name: "Mimir's Ancient Wisdom",
        oracle_id: "1c9e1f75-73f0-4846-b53f-458a0984b1bb",
        image_uris: {
          normal: "https://cards.scryfall.io/normal/front.jpg",
          small: "https://cards.scryfall.io/small/front.jpg",
          art_crop: "https://cards.scryfall.io/art_crop/front.jpg",
        },
      },
      {
        name: "Teferi's Ageless Insight",
        oracle_id: "1c9e1f75-73f0-4846-b53f-458a0984b1bb",
        image_uris: { normal: "https://cards.scryfall.io/normal/back.jpg" },
      },
    ],
  };

  it("ingests a reversible card from its faces, oracle id included", () => {
    // The whole defect in one assertion: this printing used to be skipped, so a collection
    // row naming `sld/2214` resolved to the set's representative printing instead and drew
    // another card's art.
    const row = asPrinting(reversible);
    expect(row.oracleId).toBe("1c9e1f75-73f0-4846-b53f-458a0984b1bb");
    expect(row.setCode).toBe("sld");
    expect(row.collectorNumber).toBe("2214");
  });

  it("takes a reversible card's printed name off the FACE", () => {
    // The top level carries no `flavor_name` on this layout, so a transform that read only
    // there would ingest the printing and still draw `Teferi's Ageless Insight` on a card
    // that says `Mimir's Ancient Wisdom`.
    expect(asPrinting(reversible).flavorName).toBe("Mimir's Ancient Wisdom");
  });

  it("takes both of a reversible card's faces as front and back art", () => {
    const row = asPrinting(reversible);
    expect(row.imageUri).toBe("https://cards.scryfall.io/normal/front.jpg");
    expect(row.backImageUri).toBe("https://cards.scryfall.io/normal/back.jpg");
    expect(row.artCropUri).toBe("https://cards.scryfall.io/art_crop/front.jpg");
  });

  it("still skips a reversible card whose faces name different oracles", () => {
    // Zero of the 82 that exist do this (measured 2026-09-21), and one that did would be two
    // cards sharing stock rather than one card printed twice — a different thing, which this
    // transform has no answer for. Skipping stays the answer for the case that would be a
    // guess; it is not the answer for the case that is not.
    const disagreeing = {
      ...reversible,
      card_faces: [
        reversible.card_faces[0],
        { ...reversible.card_faces[1], oracle_id: "cccccccc-0000-0000-0000-000000000009" },
      ],
    };
    expect(classifyPrinting(disagreeing).kind).toBe("skipped-reversible");
  });

  it("skips a reversible card carrying no faces at all", () => {
    const faceless = { ...reversible, card_faces: undefined };
    expect(classifyPrinting(faceless).kind).toBe("skipped-reversible");
  });

  it("skips — rather than THROWING — when a face carries no oracle id at all", () => {
    // The near-miss this guard is written against. Sizing a set of the ids that are PRESENT
    // looks equivalent and is not: a first face with no id and a second with one gives a set
    // of size 1, passes, and then throws on the row's own `requiredString`. That exception
    // is raised inside the bulk stream, where nothing catches it — so the whole catalog
    // refresh aborts, in place of the old code skipping one entry.
    const headless = {
      ...reversible,
      card_faces: [
        { name: "Teferi's Ageless Insight", image_uris: { normal: "https://x/front.jpg" } },
        reversible.card_faces[1],
      ],
    };
    expect(() => classifyPrinting(headless)).not.toThrow();
    expect(classifyPrinting(headless).kind).toBe("skipped-reversible");
  });

  it("routes a reversible TOKEN to the skipped ledger, not to the catalog", () => {
    // `sld/1969` Mechtitan, the shape that took down the 2026-09-22 staging refresh. Its
    // layout is `reversible_card` and only the faces' type lines say Token; its other
    // printing is `tneo/14`, layout `token`, which the cards transform skips — so there is
    // no `cards` row and there should not be. Ingested anyway, it is an FK orphan, and one
    // orphan refuses the whole run's base-set sizing.
    const token = {
      ...reversible,
      id: "5d02dee4-2071-448f-9fd3-58d63635d712",
      name: "Mechtitan // Mechtitan",
      collector_number: "1969",
      card_faces: reversible.card_faces.map((f) => ({
        ...f,
        name: "Mechtitan",
        type_line: "Token Legendary Artifact Creature — Construct",
        oracle_id: "a4fecf0a-a7b3-49e4-bbb2-9690dff5a8f4",
      })),
    };
    expect(classifyPrinting(token)).toEqual({
      kind: "skipped-layout",
      row: {
        scryfallId: "5d02dee4-2071-448f-9fd3-58d63635d712",
        layout: "reversible_card",
        name: "Mechtitan // Mechtitan",
      },
    });
  });

  it("reads the TYPE LINE's opening word, not the rules text and not a mention", () => {
    // Two fixtures, because one of them measures nothing on its own. A card whose ORACLE
    // TEXT says "token" passes with the gate deleted — the gate never reads that field — so
    // it pins nothing by itself and is here only to say the rules text is out of scope.
    const maker = {
      ...reversible,
      card_faces: reversible.card_faces.map((f) => ({
        ...f,
        type_line: "Legendary Enchantment",
        oracle_text: "Create a 1/1 colorless Thopter artifact creature token.",
      })),
    };
    expect(classifyPrinting(maker).kind).toBe("printing");

    // THIS is the one that distinguishes `startsWith` from `includes`: a type line that
    // CONTAINS the word downstream of its opening. Synthetic — Scryfall types every token it
    // prints as `Token …` at the head — and here precisely because the rule is about the
    // opening word, so widening it to a substring match would start dropping real cards.
    const mentions = {
      ...reversible,
      card_faces: reversible.card_faces.map((f) => ({
        ...f,
        type_line: "Enchantment — Token Role",
      })),
    };
    expect(classifyPrinting(mentions).kind).toBe("printing");
  });

  it("treats an EMPTY face oracle id as absent rather than as a value", () => {
    // `oracle_id: ""` passes a `typeof` test, agrees with itself across both faces, and is
    // stored as a printing with an empty oracle id — which the FK check counts as an orphan,
    // and one orphan refuses the whole run's base-set sizing. Raised by review.
    const blank = {
      ...reversible,
      card_faces: reversible.card_faces.map((f) => ({ ...f, oracle_id: "" })),
    };
    expect(classifyPrinting(blank).kind).toBe("skipped-reversible");
  });

  it("skips digital-only printings", () => {
    expect(classifyPrinting({ ...plains, digital: true }).kind).toBe("skipped-digital");
  });

  it("throws on a missing required field rather than writing nulls", () => {
    expect(() => classifyPrinting({ ...plains, oracle_id: undefined })).toThrow(/oracle_id/);
    expect(() => classifyPrinting({ ...plains, set: undefined })).toThrow(/set/);
    expect(() => classifyPrinting({ ...plains, collector_number: undefined }))
      .toThrow(/collector_number/);
  });

  it("defaults finishes to nonfoil when absent", () => {
    expect(asPrinting({ ...plains, finishes: undefined }).finishes).toEqual(["nonfoil"]);
  });
});

describe("classifyPrinting — is_variant allowlist", () => {
  it("does not mark ordinary legendary cards as variants", () => {
    // frame_effects: ["legendary"] is on every legend; a truthiness test would corrupt
    // the representative pick for most commanders.
    expect(asPrinting({ ...plains, frame_effects: ["legendary"] }).isVariant).toBe(false);
  });

  it("survives absent frame_effects and promo_types keys", () => {
    // They are absent, not [], when empty — `.length > 0` throws.
    const { frame_effects, promo_types, ...rest } = {
      ...plains, frame_effects: undefined, promo_types: undefined,
    } as Record<string, unknown>;
    void frame_effects; void promo_types;
    expect(asPrinting(rest).isVariant).toBe(false);
  });

  it("marks allowlisted frame effects and promo types as variants", () => {
    expect(asPrinting({ ...plains, frame_effects: ["showcase"] }).isVariant).toBe(true);
    expect(asPrinting({ ...plains, frame_effects: ["extendedart"] }).isVariant).toBe(true);
    expect(asPrinting({ ...plains, promo_types: ["borderless"] }).isVariant).toBe(true);
    expect(asPrinting({ ...plains, promo_types: ["etched"] }).isVariant).toBe(true);
  });

  it("marks borderless border_color as a variant", () => {
    expect(asPrinting({ ...plains, border_color: "borderless" }).isVariant).toBe(true);
  });

  it("does not mark unlisted promo types as variants", () => {
    expect(asPrinting({ ...plains, promo_types: ["prerelease"] }).isVariant).toBe(false);
  });
});

describe("compareForRepresentative — natural collector-number sort", () => {
  const order = (numbers: string[]) =>
    numbers
      .map((collectorNumber) => printing({ collectorNumber }))
      .sort(compareForRepresentative)
      .map((p) => p.collectorNumber);

  it("sorts numerically, not lexically", () => {
    expect(order(["100", "2", "31"])).toEqual(["2", "31", "100"]);
  });

  it("orders 12a next to 12, by its numeric part", () => {
    expect(order(["12a", "3", "12"])).toEqual(["3", "12", "12a"]);
  });

  it("puts wholly non-numeric collector numbers last", () => {
    expect(order(["★", "269", "1"])).toEqual(["1", "269", "★"]);
  });

  it("breaks ties on the raw text", () => {
    expect(order(["12b", "12a"])).toEqual(["12a", "12b"]);
  });
});

describe("pickRepresentative", () => {
  it("prefers a base printing over a variant with a lower collector number", () => {
    const base = printing({ scryfallId: "base", collectorNumber: "269" });
    const showcase = printing({ scryfallId: "sc", collectorNumber: "12", isVariant: true });
    expect(pickRepresentative([showcase, base])?.scryfallId).toBe("base");
  });

  it("falls back to the lowest variant when every printing is a variant", () => {
    const a = printing({ scryfallId: "a", collectorNumber: "★", isVariant: true });
    const b = printing({ scryfallId: "b", collectorNumber: "300", isVariant: true });
    expect(pickRepresentative([a, b])?.scryfallId).toBe("b");
  });

  it("picks the lowest natural collector number among base printings", () => {
    const rows = [
      printing({ scryfallId: "c", collectorNumber: "274" }),
      printing({ scryfallId: "a", collectorNumber: "269" }),
      printing({ scryfallId: "b", collectorNumber: "269a" }),
    ];
    expect(pickRepresentative(rows)?.scryfallId).toBe("a");
  });

  it("returns null for an empty group", () => {
    expect(pickRepresentative([])).toBeNull();
  });
});

describe("booster and rarity", () => {
  it("carries booster through from the bulk entry", () => {
    expect(asPrinting({ ...plains, booster: true }).booster).toBe(true);
  });

  it("reads a base-run full-art basic as in-booster", () => {
    // EOE #262 is a full-art Plains: "inverted" is not a VARIANT_TREATMENT, and the
    // printing sits inside the base run.
    const row = asPrinting({
      ...plains, collector_number: "262", booster: true,
      frame_effects: ["inverted"], full_art: true,
    });
    expect(row.isVariant).toBe(false);
    expect(row.booster).toBe(true);
  });

  it("reads a showcase extra as out of booster", () => {
    const row = asPrinting({
      ...plains, collector_number: "290", booster: false, frame_effects: ["showcase"],
    });
    expect(row.booster).toBe(false);
  });

  it("carries booster false for a Commander product, which the set-level fallback handles", () => {
    // Every printing in c21 and otc is booster:false. The transform records that
    // faithfully; the fallback lives in setBaseSetSizes, because it is a property of
    // the set and not of any one printing.
    expect(asPrinting({ ...plains, set: "C21", booster: false }).booster).toBe(false);
  });

  it("leaves booster null when the entry carries no flag, rather than claiming false", () => {
    // The column is nullable so "not classified" stays distinct from "not in a booster";
    // false would file an unclassified printing under extras.
    expect(asPrinting({ ...plains }).booster).toBeNull();
  });

  it("carries the printing's own rarity, not the oracle card's", () => {
    expect(asPrinting({ ...plains, set: "exp", rarity: "mythic" }).rarity).toBe("mythic");
  });

  it("leaves rarity null when the entry carries none", () => {
    expect(asPrinting({ ...plains }).rarity).toBeNull();
  });
});
