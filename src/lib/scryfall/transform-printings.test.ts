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
  },
};

const asPrinting = (raw: Record<string, unknown>): PrintingRow => {
  const result = classifyPrinting(raw);
  if (result.kind !== "printing") throw new Error(`expected a printing, got ${result.kind}`);
  return result.row;
};

const printing = (over: Partial<PrintingRow>): PrintingRow => ({
  scryfallId: "id", oracleId: "o", setCode: "ecl", collectorNumber: "1",
  imageUri: null, imageUriSmall: null, backImageUri: null,
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
        { image_uris: { normal: "https://x/front.jpg", small: "https://x/front-s.jpg" } },
        { image_uris: { normal: "https://x/back.jpg", small: "https://x/back-s.jpg" } },
      ],
    };
    expect(asPrinting(dfc)).toMatchObject({
      imageUri: "https://x/front.jpg",
      imageUriSmall: "https://x/front-s.jpg",
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

  it("skips reversible_card, which has no top-level oracle_id", () => {
    const result = classifyPrinting({
      ...plains, layout: "reversible_card", oracle_id: undefined,
    });
    expect(result.kind).toBe("skipped-reversible");
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
