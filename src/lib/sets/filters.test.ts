import { describe, expect, it } from "vitest";
import { applyFilters, EMPTY_FILTERS, isQueryActive, parseFilters, serialiseFilters, type SetGridFilters } from "./filters";
import type { Cell } from "./completion";

const cell = (over: Partial<Cell>): Cell => ({
  scryfallId: "s", oracleId: "o", collectorNumber: "1", name: "Card",
  imageUriSmall: null, colorIdentity: [], rarity: "common", booster: true,
  isVariant: false, owned: false, byName: false, foilOnly: false, ...over,
});

describe("applyFilters", () => {
  it("keeps only missing cells under missing-only", () => {
    const cells = [cell({ owned: true }), cell({ collectorNumber: "2" })];
    expect(applyFilters(cells, { ...EMPTY_FILTERS, missingOnly: true })).toHaveLength(1);
  });

  it("matches a colour when the identity contains it", () => {
    const cells = [cell({ colorIdentity: ["R", "G"] })];
    expect(applyFilters(cells, { ...EMPTY_FILTERS, colors: ["R"] })).toHaveLength(1);
  });

  it("treats multiple colours as any, never as exactly", () => {
    const cells = [cell({ colorIdentity: ["W"] }), cell({ colorIdentity: ["U"] })];
    expect(applyFilters(cells, { ...EMPTY_FILTERS, colors: ["W", "U"] })).toHaveLength(2);
  });

  it("keeps a colourless card out of every colour filter", () => {
    const cells = [cell({ colorIdentity: [] })];
    expect(applyFilters(cells, { ...EMPTY_FILTERS, colors: ["W"] })).toHaveLength(0);
  });

  it("matches rarity case-insensitively against the printing's own rarity", () => {
    const cells = [cell({ rarity: "Mythic" })];
    expect(applyFilters(cells, { ...EMPTY_FILTERS, rarities: ["mythic"] })).toHaveLength(1);
  });

  it("drops a cell whose rarity the catalog has not recorded", () => {
    const cells = [cell({ rarity: null })];
    expect(applyFilters(cells, { ...EMPTY_FILTERS, rarities: ["rare"] })).toHaveLength(0);
  });

  it("combines missing-only with rarity", () => {
    const cells = [
      cell({ rarity: "rare", owned: true }),
      cell({ collectorNumber: "2", rarity: "rare" }),
      cell({ collectorNumber: "3", rarity: "common" }),
    ];
    const kept = applyFilters(cells, { ...EMPTY_FILTERS, rarities: ["rare"], missingOnly: true });
    expect(kept.map((c) => c.collectorNumber)).toEqual(["2"]);
  });

  it("returns nothing when the combination matches nothing", () => {
    const cells = [cell({ rarity: "common", colorIdentity: ["W"] })];
    expect(applyFilters(cells, { ...EMPTY_FILTERS, rarities: ["mythic"], colors: ["W"] }))
      .toHaveLength(0);
  });
});

describe("filter URL round trip", () => {
  it("serialises defaults as absences", () => {
    expect(serialiseFilters(EMPTY_FILTERS).toString()).toBe("");
  });

  it("joins colours on a comma in WUBRG order", () => {
    expect(serialiseFilters({ ...EMPTY_FILTERS, colors: ["R", "W"] }).get("c")).toBe("W,R");
  });

  it("writes missing-only as m=1", () => {
    expect(serialiseFilters({ ...EMPTY_FILTERS, missingOnly: true }).get("m")).toBe("1");
  });

  it("round trips", () => {
    const f = { colors: ["U"], rarities: ["rare"], missingOnly: true, query: "plains" };
    expect(parseFilters(serialiseFilters(f))).toEqual(f);
  });

  it("ignores an unknown colour or rarity rather than throwing", () => {
    expect(parseFilters(new URLSearchParams("c=Z&r=legendary"))).toEqual(EMPTY_FILTERS);
  });

  it("reads m as off unless it is exactly 1", () => {
    expect(parseFilters(new URLSearchParams("m=true")).missingOnly).toBe(false);
  });
});

describe("hand-edited URLs", () => {
  it("parses a rarity whatever case it was typed in", () => {
    expect(parseFilters(new URLSearchParams("r=Mythic")).rarities).toEqual(["mythic"]);
  });

  it("parses a colour whatever case it was typed in", () => {
    expect(parseFilters(new URLSearchParams("c=u,g")).colors).toEqual(["U", "G"]);
  });

  it("cannot represent a rarity the rack does not offer", () => {
    // `special` was parseable while no control could select it and no copy named it, so a
    // URL could carry a filter state no reader could reach or clear.
    expect(parseFilters(new URLSearchParams("r=special")).rarities).toEqual([]);
  });
});

// Addendum R2 §29 — the name search is a fourth field on SetGridFilters and goes through
// applyFilters, never a second pass over what is shown. That is what keeps the result line,
// the Send N label, the cost denominator and the rarity panel's per-row counts agreeing.
describe("applyFilters — the name search", () => {
  const c = (name: string, over: Partial<Cell> = {}): Cell => ({
    scryfallId: `s-${name}`, oracleId: `o-${name}`, collectorNumber: "1", name,
    imageUriSmall: null, colorIdentity: ["W"], rarity: "common", booster: true,
    owned: false, byName: false, foilOnly: false, isVariant: false, ...over,
  });
  const f = (query: string): SetGridFilters => ({ ...EMPTY_FILTERS, query });

  it("matches a substring of the name, case-insensitively", () => {
    const cells = [c("Plains"), c("Mountain")];
    expect(applyFilters(cells, f("plain")).map((x) => x.name)).toEqual(["Plains"]);
    expect(applyFilters(cells, f("MOUNT")).map((x) => x.name)).toEqual(["Mountain"]);
  });

  it("folds diacritics: jotun finds Jötun", () => {
    expect(applyFilters([c("Jötun Grunt")], f("jotun"))).toHaveLength(1);
  });

  // NFD has no base letter to separate out of a ligature, so this case needs its own pass
  // and would otherwise have failed silently.
  it("folds the Æ ligature: aether finds Æther", () => {
    expect(applyFilters([c("Æther Vial")], f("aether"))).toHaveLength(1);
    expect(applyFilters([c("Æther Vial")], f("æther"))).toHaveLength(1);
  });

  it("matches either half of a // name", () => {
    const split = c("Fire // Ice");
    expect(applyFilters([split], f("ice"))).toHaveLength(1);
    expect(applyFilters([split], f("fire"))).toHaveLength(1);
  });

  it("matches nothing about the card but its name", () => {
    const cell = c("Plains", { rarity: "common", collectorNumber: "282" });
    expect(applyFilters([cell], f("common"))).toHaveLength(0);
    expect(applyFilters([cell], f("282"))).toHaveLength(0);
  });

  it("is inert when empty or blank", () => {
    const cells = [c("Plains"), c("Mountain")];
    expect(applyFilters(cells, f(""))).toHaveLength(2);
    expect(applyFilters(cells, f("   "))).toHaveLength(2);
  });

  it("intersects with the other dimensions rather than replacing them", () => {
    const cells = [
      c("Plains", { rarity: "common" }),
      c("Plainswalker", { rarity: "rare" }),
    ];
    const filtered = applyFilters(cells, { ...EMPTY_FILTERS, query: "plains", rarities: ["rare"] });
    expect(filtered.map((x) => x.name)).toEqual(["Plainswalker"]);
  });
});

describe("serialiseFilters / parseFilters — q", () => {
  it("writes q and reads it back", () => {
    expect(serialiseFilters({ ...EMPTY_FILTERS, query: "plains" }).toString()).toBe("q=plains");
    expect(parseFilters(new URLSearchParams("q=plains")).query).toBe("plains");
  });

  it("serialises an empty or blank query as an absence", () => {
    expect(serialiseFilters({ ...EMPTY_FILTERS, query: "" }).toString()).toBe("");
    expect(serialiseFilters({ ...EMPTY_FILTERS, query: "  " }).toString()).toBe("");
  });

  it("defaults to an empty string when the parameter is absent", () => {
    expect(parseFilters(new URLSearchParams("")).query).toBe("");
  });
});

describe("parseFilters — a blank query", () => {
  // `serialiseFilters` omits a blank query, so an untrimmed parse left `?q=%20` sitting in
  // the field looking empty and in a shared URL looking like a filter, until some other
  // control happened to rewrite the string.
  it("trims whitespace on the way in", () => {
    expect(parseFilters(new URLSearchParams("q=%20%20")).query).toBe("");
    expect(parseFilters(new URLSearchParams("q=%20plains%20")).query).toBe("plains");
  });
});

describe("isQueryActive — the one question every reader asks", () => {
  // A query of nothing but combining marks survives `trim` and folds to empty, so
  // `matchesQuery` matched every card while serialisation, the badge, the result line and
  // the clear button all believed a filter was on: `q` in the URL over an unfiltered grid.
  it("calls a combining-mark-only query inactive", () => {
    expect(isQueryActive("́")).toBe(false);
    expect(isQueryActive("  ́̈ ")).toBe(false);
    expect(serialiseFilters({ ...EMPTY_FILTERS, query: "́" }).toString()).toBe("");
    expect(applyFilters(
      [{
        scryfallId: "s", oracleId: "o", collectorNumber: "1", name: "Plains",
        imageUriSmall: null, colorIdentity: [], rarity: "common", booster: true,
        isVariant: false, owned: false, byName: false, foilOnly: false,
      }],
      { ...EMPTY_FILTERS, query: "́" },
    )).toHaveLength(1);
  });

  it("and a real one active", () => {
    expect(isQueryActive("plains")).toBe(true);
    expect(isQueryActive("  plains  ")).toBe(true);
    // Folded, so an accented query still counts as one.
    expect(isQueryActive("jötun")).toBe(true);
  });
});
