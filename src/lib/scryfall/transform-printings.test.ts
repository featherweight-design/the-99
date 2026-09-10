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
  imageUri: null, imageUriSmall: null, finishes: ["nonfoil"], isVariant: false,
  flavorName: null, ...over,
});

describe("classifyPrinting", () => {
  it("maps a default_cards entry to a printings row", () => {
    expect(asPrinting(plains)).toEqual({
      scryfallId: "aaaaaaaa-0000-0000-0000-000000000001",
      oracleId: "bbbbbbbb-0000-0000-0000-000000000001",
      setCode: "ecl",
      collectorNumber: "269",
      imageUri: "https://cards.scryfall.io/normal/plains.jpg",
      imageUriSmall: "https://cards.scryfall.io/small/plains.jpg",
      finishes: ["nonfoil", "foil"],
      isVariant: false,
      flavorName: null,
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
    });
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
