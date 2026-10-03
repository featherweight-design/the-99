import { describe, it, expect } from "vitest";
import {
  buildSetOptions,
  rankSetOptions,
  parseSetCodesParam,
  serializeSetCodes,
  type OwnedSetMeta,
} from "./set-filter";
import type { BrowseListCard } from "./browse";

const card = (over: Partial<BrowseListCard> = {}): BrowseListCard => ({
  oracleId: "o-1",
  name: "Sol Ring",
  typeLine: "Artifact",
  manaCost: "{1}",
  rarity: "rare",
  colorIdentity: [],
  imageUri: null,
  printedName: null,
  quantity: 1,
  setCounts: [["BLB", 1]],
  primarySetCode: "BLB",
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
      card({ oracleId: "a", setCounts: [["MH3", 1]] }),
      card({ oracleId: "b", setCounts: [["BLC", 1]] }),
      card({ oracleId: "c", setCounts: [["BLB", 1]] }),
    ];
    expect(buildSetOptions(cards, noFilters, meta).map((o) => o.label)).toEqual([
      "Bloomburrow", "Bloomburrow Commander", "Modern Horizons 3",
    ]);
  });

  it("counts a lowercase set code against its uppercased option", () => {
    const cards = [card({ oracleId: "a", setCounts: [["mh3", 4]] })];
    const [option] = buildSetOptions(cards, noFilters, meta);
    expect(option.code).toBe("MH3");
    expect(option.count).toBe(4);
  });

  it("sorts undated sets last, A→Z among themselves", () => {
    const withUndated: OwnedSetMeta[] = [
      ...meta,
      { code: "sld", name: "Secret Lair Drop", releasedAt: null },
      { code: "plst", name: "The List", releasedAt: null },
    ];
    const cards = [
      card({ oracleId: "a", setCounts: [["SLD", 1]] }),
      card({ oracleId: "b", setCounts: [["PLST", 1]] }),
      card({ oracleId: "c", setCounts: [["MH3", 1]] }),
    ];
    expect(buildSetOptions(cards, noFilters, withUndated).map((o) => o.label)).toEqual([
      "Modern Horizons 3", "Secret Lair Drop", "The List",
    ]);
  });

  it("falls back to the uppercased code when no sets row exists, keeping the count", () => {
    const cards = [card({ setCounts: [["XYZ", 3]] })];
    expect(buildSetOptions(cards, noFilters, meta)).toEqual([
      { code: "XYZ", label: "XYZ", hint: undefined, count: 3, disabled: false, releasedAt: null },
    ]);
  });

  it("carries the set code as a hint alongside the name", () => {
    const cards = [card({ setCounts: [["MH3", 1]] })];
    expect(buildSetOptions(cards, noFilters, meta)[0]).toMatchObject({
      label: "Modern Horizons 3",
      hint: "MH3",
    });
  });

  it("counts sum owned quantities per set, not distinct oracle cards", () => {
    const cards = [
      card({
        oracleId: "a",
        quantity: 5,
        setCounts: [["BLB", 4], ["MH3", 1]],
      }),
      card({ oracleId: "b", quantity: 2, setCounts: [["BLB", 2]] }),
    ];
    const counts = Object.fromEntries(buildSetOptions(cards, noFilters, meta).map((o) => [o.code, o.count]));
    expect(counts).toEqual({ BLB: 6, MH3: 1 });
  });

  it("counts respect the other structured filters and keep zero-count sets listed as disabled", () => {
    const cards = [
      card({ oracleId: "a", typeLine: "Instant", setCounts: [["BLB", 2]] }),
      card({ oracleId: "b", typeLine: "Creature", setCounts: [["MH3", 9]] }),
    ];
    const options = buildSetOptions(cards, { ...noFilters, types: ["Instant"] }, meta);
    expect(options.map((o) => [o.code, o.count, o.disabled])).toEqual([
      ["BLB", 2, false],
      ["MH3", 0, true],
    ]);
  });

  it("counts respect the color filter", () => {
    const cards = [
      card({ oracleId: "a", colorIdentity: ["R"], setCounts: [["BLB", 2]] }),
      card({ oracleId: "b", colorIdentity: ["U"], setCounts: [["MH3", 4]] }),
    ];
    const options = buildSetOptions(cards, { ...noFilters, colors: ["R"] }, meta);
    expect(options.map((o) => o.count)).toEqual([2, 0]);
  });

  // H10: the colour MATCH mode, not just the colours — omitted, a card Exactly excludes still
  // counted (the pre-open pass found it). `a`'s identity ["R","U"] is a superset of the
  // selection ["R"]: contains keeps it, exactly excludes it (identity is not the selection).
  it("counts respect the colour match mode", () => {
    const cards = [
      card({ oracleId: "a", colorIdentity: ["R", "U"], setCounts: [["BLB", 2]] }),
      card({ oracleId: "b", colorIdentity: ["R"], setCounts: [["MH3", 4]] }),
    ];
    const contains = buildSetOptions(cards, { ...noFilters, colors: ["R"] }, meta);
    const exact = buildSetOptions(cards, { ...noFilters, colors: ["R"], match: "exactly" }, meta);
    expect(contains.map((o) => o.count)).toEqual([2, 4]);
    expect(exact.map((o) => o.count)).toEqual([0, 4]);
  });

  it("ignores the free-text search box so counts stay stable while typing", () => {
    const cards = [
      card({ oracleId: "a", name: "Sol Ring", setCounts: [["BLB", 2]] }),
      card({ oracleId: "b", name: "Cyclonic Rift", setCounts: [["MH3", 4]] }),
    ];
    const options = buildSetOptions(cards, { ...noFilters, search: "sol" }, meta);
    expect(options.map((o) => o.count)).toEqual([2, 4]);
  });

  it("ignores the set selection itself — a selected set still counts its own cards", () => {
    const cards = [
      card({ oracleId: "a", setCounts: [["BLB", 2]] }),
      card({ oracleId: "b", setCounts: [["MH3", 4]] }),
    ];
    const options = buildSetOptions(cards, { ...noFilters, setCodes: ["BLB"] }, meta);
    expect(options.map((o) => o.count)).toEqual([2, 4]);
  });

  it("lists every owned set exactly once, however many of it a card carries", () => {
    const cards = [
      card({ oracleId: "a", setCounts: [["BLB", 2]] }),
      card({ oracleId: "b", setCounts: [["BLB", 1]] }),
    ];
    expect(buildSetOptions(cards, noFilters, meta).map((o) => o.code)).toEqual(["BLB"]);
  });
});

describe("rankSetOptions", () => {
  const options = buildSetOptions(
    [
      card({ oracleId: "a", setCounts: [["MH3", 1]] }),
      card({ oracleId: "b", setCounts: [["BLC", 1]] }),
      card({ oracleId: "c", setCounts: [["BLB", 1]] }),
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
        card({ oracleId: "a", setCounts: [["MH3", 1]] }),
        card({ oracleId: "b", setCounts: [["HOR", 1]] }),
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
