import { describe, it, expect } from "vitest";
import {
  buildSetOptions,
  rankSetOptions,
  parseSetCodesParam,
  serializeSetCodes,
  type OwnedSetMeta,
} from "./set-filter";
import type { BrowseCard, BrowsePrinting } from "./browse";

const printing = (over: Partial<BrowsePrinting> = {}): BrowsePrinting => ({
  setCode: "BLB", setName: "Bloomburrow", collectorNumber: "1", releasedAt: "2024-08-02",
  quantity: 1, finishes: { nonfoil: 1 }, imageUri: null, ...over,
});

const card = (over: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId: "o-1",
  name: "Sol Ring",
  typeLine: "Artifact",
  manaCost: "{1}",
  oracleText: null,
  keywords: [],
  rarity: "rare",
  colorIdentity: [],
  imageUri: null,
  quantity: 1,
  printings: [printing()],
  setCodes: ["BLB"],
  primarySetCode: "BLB",
  preferredPrinting: null,
  ...over,
});

const meta: OwnedSetMeta[] = [
  { code: "blb", name: "Bloomburrow", releasedAt: "2024-08-02" },
  { code: "mh3", name: "Modern Horizons 3", releasedAt: "2024-06-14" },
  { code: "blc", name: "Bloomburrow Commander", releasedAt: "2024-08-02" },
];

const noFilters = { search: "", colors: [], types: [], setCodes: [] };

describe("buildSetOptions", () => {
  it("orders by release date descending, ties A→Z by name", () => {
    const cards = [
      card({ oracleId: "a", setCodes: ["MH3"], printings: [printing({ setCode: "MH3" })] }),
      card({ oracleId: "b", setCodes: ["BLC"], printings: [printing({ setCode: "BLC" })] }),
      card({ oracleId: "c", setCodes: ["BLB"], printings: [printing({ setCode: "BLB" })] }),
    ];
    expect(buildSetOptions(cards, noFilters, meta).map((o) => o.label)).toEqual([
      "Bloomburrow", "Bloomburrow Commander", "Modern Horizons 3",
    ]);
  });

  it("sorts undated sets last, A→Z among themselves", () => {
    const withUndated: OwnedSetMeta[] = [
      ...meta,
      { code: "sld", name: "Secret Lair Drop", releasedAt: null },
      { code: "plst", name: "The List", releasedAt: null },
    ];
    const cards = [
      card({ oracleId: "a", setCodes: ["SLD"], printings: [printing({ setCode: "SLD" })] }),
      card({ oracleId: "b", setCodes: ["PLST"], printings: [printing({ setCode: "PLST" })] }),
      card({ oracleId: "c", setCodes: ["MH3"], printings: [printing({ setCode: "MH3" })] }),
    ];
    expect(buildSetOptions(cards, noFilters, withUndated).map((o) => o.label)).toEqual([
      "Modern Horizons 3", "Secret Lair Drop", "The List",
    ]);
  });

  it("falls back to the uppercased code when no sets row exists, keeping the count", () => {
    const cards = [card({ setCodes: ["XYZ"], printings: [printing({ setCode: "XYZ", quantity: 3 })] })];
    expect(buildSetOptions(cards, noFilters, meta)).toEqual([
      { code: "XYZ", label: "XYZ", count: 3, disabled: false, releasedAt: null },
    ]);
  });

  it("counts sum owned quantities per printing, not distinct oracle cards", () => {
    const cards = [
      card({
        oracleId: "a",
        setCodes: ["BLB", "MH3"],
        quantity: 5,
        printings: [printing({ setCode: "BLB", quantity: 4 }), printing({ setCode: "MH3", quantity: 1 })],
      }),
      card({ oracleId: "b", setCodes: ["BLB"], quantity: 2, printings: [printing({ setCode: "BLB", quantity: 2 })] }),
    ];
    const counts = Object.fromEntries(buildSetOptions(cards, noFilters, meta).map((o) => [o.code, o.count]));
    expect(counts).toEqual({ BLB: 6, MH3: 1 });
  });

  it("counts respect the other structured filters and keep zero-count sets listed as disabled", () => {
    const cards = [
      card({ oracleId: "a", typeLine: "Instant", setCodes: ["BLB"], printings: [printing({ setCode: "BLB", quantity: 2 })] }),
      card({ oracleId: "b", typeLine: "Creature", setCodes: ["MH3"], printings: [printing({ setCode: "MH3", quantity: 9 })] }),
    ];
    const options = buildSetOptions(cards, { ...noFilters, types: ["Instant"] }, meta);
    expect(options.map((o) => [o.code, o.count, o.disabled])).toEqual([
      ["BLB", 2, false],
      ["MH3", 0, true],
    ]);
  });

  it("counts respect the colour filter", () => {
    const cards = [
      card({ oracleId: "a", colorIdentity: ["R"], setCodes: ["BLB"], printings: [printing({ setCode: "BLB", quantity: 2 })] }),
      card({ oracleId: "b", colorIdentity: ["U"], setCodes: ["MH3"], printings: [printing({ setCode: "MH3", quantity: 4 })] }),
    ];
    const options = buildSetOptions(cards, { ...noFilters, colors: ["R"] }, meta);
    expect(options.map((o) => o.count)).toEqual([2, 0]);
  });

  it("ignores the free-text search box so counts stay stable while typing", () => {
    const cards = [
      card({ oracleId: "a", name: "Sol Ring", setCodes: ["BLB"], printings: [printing({ setCode: "BLB", quantity: 2 })] }),
      card({ oracleId: "b", name: "Cyclonic Rift", setCodes: ["MH3"], printings: [printing({ setCode: "MH3", quantity: 4 })] }),
    ];
    const options = buildSetOptions(cards, { ...noFilters, search: "sol" }, meta);
    expect(options.map((o) => o.count)).toEqual([2, 4]);
  });

  it("ignores the set selection itself — a selected set still counts its own cards", () => {
    const cards = [
      card({ oracleId: "a", setCodes: ["BLB"], printings: [printing({ setCode: "BLB", quantity: 2 })] }),
      card({ oracleId: "b", setCodes: ["MH3"], printings: [printing({ setCode: "MH3", quantity: 4 })] }),
    ];
    const options = buildSetOptions(cards, { ...noFilters, setCodes: ["BLB"] }, meta);
    expect(options.map((o) => o.count)).toEqual([2, 4]);
  });

  it("lists every owned set exactly once, even across many printings", () => {
    const cards = [
      card({ oracleId: "a", setCodes: ["BLB"], printings: [printing({ setCode: "BLB" }), printing({ setCode: "BLB", collectorNumber: "2" })] }),
      card({ oracleId: "b", setCodes: ["BLB"], printings: [printing({ setCode: "BLB", collectorNumber: "3" })] }),
    ];
    expect(buildSetOptions(cards, noFilters, meta).map((o) => o.code)).toEqual(["BLB"]);
  });
});

describe("rankSetOptions", () => {
  const options = buildSetOptions(
    [
      card({ oracleId: "a", setCodes: ["MH3"], printings: [printing({ setCode: "MH3" })] }),
      card({ oracleId: "b", setCodes: ["BLC"], printings: [printing({ setCode: "BLC" })] }),
      card({ oracleId: "c", setCodes: ["BLB"], printings: [printing({ setCode: "BLB" })] }),
    ],
    noFilters,
    meta,
  );

  it("an empty query keeps the release order untouched", () => {
    expect(rankSetOptions(options, "").map((o) => o.code)).toEqual(["BLB", "BLC", "MH3"]);
  });
  it("matches name substrings case-insensitively", () => {
    expect(rankSetOptions(options, "BLOOM").map((o) => o.code)).toEqual(["BLB", "BLC"]);
  });
  it("matches the set code too", () => {
    expect(rankSetOptions(options, "mh3").map((o) => o.code)).toEqual(["MH3"]);
  });
  it("ranks prefix matches above substring matches, release order inside each group", () => {
    const horizons: OwnedSetMeta[] = [
      { code: "mh3", name: "Modern Horizons 3", releasedAt: "2024-06-14" },
      { code: "hor", name: "Horizon Canopy Set", releasedAt: "2020-01-01" },
    ];
    const built = buildSetOptions(
      [
        card({ oracleId: "a", setCodes: ["MH3"], printings: [printing({ setCode: "MH3" })] }),
        card({ oracleId: "b", setCodes: ["HOR"], printings: [printing({ setCode: "HOR" })] }),
      ],
      noFilters,
      horizons,
    );
    // Release order alone would put Modern Horizons 3 first; "horizon" prefixes the older set.
    expect(rankSetOptions(built, "horizon").map((o) => o.code)).toEqual(["HOR", "MH3"]);
  });
  it("returns an empty list when nothing matches", () => {
    expect(rankSetOptions(options, "eldraen")).toEqual([]);
  });
});

describe("set-code URL param", () => {
  it("round-trips a multi-selection", () => {
    expect(parseSetCodesParam(serializeSetCodes(["BLB", "MH3"]))).toEqual(["BLB", "MH3"]);
  });
  it("serializes comma-joined", () => {
    expect(serializeSetCodes(["BLB", "MH3"])).toBe("BLB,MH3");
  });
  it("serializes an empty selection to an empty string", () => {
    expect(serializeSetCodes([])).toBe("");
  });
  it("parses a legacy single bare code", () => {
    expect(parseSetCodesParam("blb")).toEqual(["BLB"]);
  });
  it("parses null / empty as no selection", () => {
    expect(parseSetCodesParam(null)).toEqual([]);
    expect(parseSetCodesParam("")).toEqual([]);
  });
  it("drops blanks and duplicates and uppercases", () => {
    expect(parseSetCodesParam("blb,,MH3, blb ")).toEqual(["BLB", "MH3"]);
  });
});
