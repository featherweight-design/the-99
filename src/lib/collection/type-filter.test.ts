import { describe, it, expect } from "vitest";
import { buildTypeOptions, parseTypesParam, serializeTypes } from "./type-filter";
import { AVAILABLE_TYPES, type BrowseListCard } from "./browse";

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

const noFilters = { search: "", colors: [], types: [], setCodes: [] };

const cards = [
  card({ oracleId: "a", typeLine: "Artifact", quantity: 2 }),
  card({ oracleId: "b", typeLine: "Instant", colorIdentity: ["R"], quantity: 3 }),
  card({ oracleId: "c", typeLine: "Legendary Creature — Elf Druid", colorIdentity: ["G"], quantity: 1 }),
  card({
    oracleId: "d",
    typeLine: "Artifact Creature — Golem",
    setCounts: [["MH3", 1]],
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

  // H10: a sibling option's count is under the OTHER filters, which now includes the colour
  // match mode — omitting it counted a card the actual list excludes (the pre-open pass found
  // it). `gu`'s identity is ["G","U"], a superset of the selection: contains keeps it (identity
  // holds every selected colour) and exactly excludes it (identity is not the selection itself).
  it("counts under the colour match mode, not just the colours", () => {
    const withGU = [...cards, card({ oracleId: "gu", typeLine: "Creature", colorIdentity: ["G", "U"], quantity: 1 })];
    const contains = buildTypeOptions(withGU, { ...noFilters, colors: ["G"] });
    const exact = buildTypeOptions(withGU, { ...noFilters, colors: ["G"], match: "exactly" });
    // `c` (identity ["G"]) matches both modes; `gu` matches contains only.
    expect(contains.find((o) => o.code === "Creature")!.count).toBe(2);
    expect(exact.find((o) => o.code === "Creature")!.count).toBe(1);
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

describe("buildTypeOptions: a two-faced card counts under its front face only", () => {
  const smashing = [card({ oracleId: "s", typeLine: "Sorcery // Land", quantity: 2 })];
  const count = (label: string) =>
    buildTypeOptions(smashing, noFilters).find((o) => o.label === label)?.count;
  it("Shatterskull Smashing counts under Sorcery, not Land", () => {
    expect(count("Sorcery")).toBe(2);
    expect(count("Land")).toBe(0);
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
