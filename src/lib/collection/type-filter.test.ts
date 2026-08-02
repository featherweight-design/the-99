import { describe, it, expect } from "vitest";
import { buildTypeOptions, parseTypesParam, serializeTypes } from "./type-filter";
import { AVAILABLE_TYPES, type BrowseCard, type BrowsePrinting } from "./browse";

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

const noFilters = { search: "", colors: [], types: [], setCodes: [] };

const cards = [
  card({ oracleId: "a", typeLine: "Artifact", quantity: 2 }),
  card({ oracleId: "b", typeLine: "Instant", colorIdentity: ["R"], quantity: 3 }),
  card({ oracleId: "c", typeLine: "Legendary Creature — Elf Druid", colorIdentity: ["G"], quantity: 1 }),
  card({
    oracleId: "d",
    typeLine: "Artifact Creature — Golem",
    setCodes: ["MH3"],
    printings: [printing({ setCode: "MH3" })],
    quantity: 4,
  }),
];

describe("buildTypeOptions", () => {
  it("lists the whole vocabulary, in the design's fixed order", () => {
    expect(buildTypeOptions(cards, noFilters).map((o) => o.code)).toEqual([...AVAILABLE_TYPES]);
  });

  it("counts quantities owned, not distinct cards", () => {
    const counts = Object.fromEntries(buildTypeOptions(cards, noFilters).map((o) => [o.code, o.count]));
    // Artifact: the Sol Ring (2) plus the artifact creature (4).
    expect(counts.Artifact).toBe(6);
    expect(counts.Instant).toBe(3);
  });

  it("matches a type anywhere in the type line, not just at the start", () => {
    const counts = Object.fromEntries(buildTypeOptions(cards, noFilters).map((o) => [o.code, o.count]));
    // "Legendary Creature — …" and "Artifact Creature — …" are both creatures.
    expect(counts.Creature).toBe(5);
  });

  it("keeps a type with no matches, disabled rather than removed", () => {
    const land = buildTypeOptions(cards, noFilters).find((o) => o.code === "Land")!;
    expect(land.count).toBe(0);
    expect(land.disabled).toBe(true);
  });

  it("counts under the color filter", () => {
    const counts = Object.fromEntries(
      buildTypeOptions(cards, { ...noFilters, colors: ["G"] }).map((o) => [o.code, o.count]),
    );
    expect(counts.Creature).toBe(1);
    expect(counts.Instant).toBe(0);
  });

  it("counts under the set filter", () => {
    const counts = Object.fromEntries(
      buildTypeOptions(cards, { ...noFilters, setCodes: ["MH3"] }).map((o) => [o.code, o.count]),
    );
    expect(counts.Creature).toBe(4);
    expect(counts.Instant).toBe(0);
  });

  it("ignores the type selection itself, so a chosen type is not its own subset", () => {
    const all = buildTypeOptions(cards, noFilters);
    const narrowed = buildTypeOptions(cards, { ...noFilters, types: ["Instant"] });
    expect(narrowed).toEqual(all);
  });

  it("ignores the search box, so the numbers stay still while typing", () => {
    expect(buildTypeOptions(cards, { ...noFilters, search: "sol" })).toEqual(
      buildTypeOptions(cards, noFilters),
    );
  });
});

describe("parseTypesParam", () => {
  it("reads a comma-separated list", () => {
    expect(parseTypesParam("Creature,Land")).toEqual(["Creature", "Land"]);
  });

  it("still reads a single bare type, so pre-#100 links survive", () => {
    expect(parseTypesParam("Creature")).toEqual(["Creature"]);
  });

  it("normalizes case to the known vocabulary", () => {
    expect(parseTypesParam("creature,LAND")).toEqual(["Creature", "Land"]);
  });

  it("drops values outside the vocabulary rather than filtering on them", () => {
    expect(parseTypesParam("Creature,Vehicle,<script>")).toEqual(["Creature"]);
  });

  it("de-duplicates and treats an absent param as no filter", () => {
    expect(parseTypesParam("Land,land")).toEqual(["Land"]);
    expect(parseTypesParam(null)).toEqual([]);
    expect(parseTypesParam("")).toEqual([]);
  });

  it("round-trips through serializeTypes", () => {
    const types = ["Creature", "Land"];
    expect(parseTypesParam(serializeTypes(types))).toEqual(types);
  });
});
