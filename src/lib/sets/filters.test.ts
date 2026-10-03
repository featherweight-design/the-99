import { describe, expect, it } from "vitest";
import {
  applyFilters, EMPTY_FILTERS, isQueryActive, parseFilters, serialiseFilters,
  type SetGridFilters,
} from "./filters";
import type { Cell } from "./completion";

const cell = (over: Partial<Cell>): Cell => ({
  scryfallId: "s", oracleId: "o", collectorNumber: "1", name: "Card",
  imageUriSmall: null, colorIdentity: [], rarity: "common", booster: true,
  isVariant: false, owned: false, byName: false, foilOnly: false, ...over,
});

describe("applyFilters", () => {
  it("keeps only missing cells under missing-only", () => {
    const cells = [cell({ owned: true }), cell({ collectorNumber: "2" })];
    const kept = applyFilters(cells, { ...EMPTY_FILTERS, missingOnly: true });
    expect(kept.map((c) => c.collectorNumber)).toEqual(["2"]);
  });

  it("matches a colour when the identity contains it", () => {
    const cells = [cell({ colorIdentity: ["R", "G"] })];
    expect(applyFilters(cells, { ...EMPTY_FILTERS, colors: ["R"] })).toHaveLength(1);
  });

  // H10: the commander rack's meanings. `Any` (contains) is ALL the lit colours, which is
  // the reverse of the any-of rule this page used to apply.
  it("treats multiple colours under Any as all of them", () => {
    const cells = [
      cell({ collectorNumber: "1", colorIdentity: ["W"] }),
      cell({ collectorNumber: "2", colorIdentity: ["U"] }),
      cell({ collectorNumber: "3", colorIdentity: ["W", "U"] }),
      cell({ collectorNumber: "4", colorIdentity: ["W", "U", "B"] }),
    ];
    const kept = applyFilters(cells, { ...EMPTY_FILTERS, colors: ["W", "U"], match: "contains" });
    expect(kept.map((c) => c.collectorNumber)).toEqual(["3", "4"]);
  });

  it("keeps only the identity that is the selection under Exactly", () => {
    const cells = [
      cell({ collectorNumber: "1", colorIdentity: ["W"] }),
      cell({ collectorNumber: "3", colorIdentity: ["W", "U"] }),
      cell({ collectorNumber: "4", colorIdentity: ["W", "U", "B"] }),
    ];
    const kept = applyFilters(cells, { ...EMPTY_FILTERS, colors: ["W", "U"], match: "exactly" });
    expect(kept.map((c) => c.collectorNumber)).toEqual(["3"]);
  });

  it("leaves an empty colour selection alone under either mode", () => {
    const cells = [cell({ colorIdentity: [] }), cell({ collectorNumber: "2", colorIdentity: ["G"] })];
    expect(applyFilters(cells, { ...EMPTY_FILTERS, match: "exactly" })).toHaveLength(2);
  });

  // H13: multi-select is a union within the dimension.
  it("keeps a cell matching ANY selected rarity", () => {
    const cells = [
      cell({ collectorNumber: "1", rarity: "rare" }),
      cell({ collectorNumber: "2", rarity: "mythic" }),
      cell({ collectorNumber: "3", rarity: "common" }),
    ];
    const kept = applyFilters(cells, { ...EMPTY_FILTERS, rarities: ["rare", "mythic"] });
    expect(kept.map((c) => c.collectorNumber)).toEqual(["1", "2"]);
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

  // H10 took `m` for the colour modifier, and one key cannot carry `1` and `exact` at once.
  it("writes missing-only as own=missing, never m=1", () => {
    const missing = serialiseFilters({ ...EMPTY_FILTERS, missingOnly: true });
    expect(missing.get("own")).toBe("missing");
    expect(missing.has("m")).toBe(false);
  });

  it("round trips", () => {
    const f: SetGridFilters = {
      colors: ["W", "U"], match: "exactly", rarities: ["rare", "mythic"], missingOnly: true,
      query: "plains",
    };
    expect(parseFilters(serialiseFilters(f))).toEqual(f);
  });

  it("ignores an unknown colour or rarity rather than throwing", () => {
    expect(parseFilters(new URLSearchParams("c=Z&r=legendary"))).toEqual(EMPTY_FILTERS);
  });

  // `m` was missing-only before H10 took it for the colour modifier. A link written then
  // still opens on the missing cards.
  it("reads the legacy m=1 as missing-only", () => {
    expect(parseFilters(new URLSearchParams("m=1")).missingOnly).toBe(true);
    expect(parseFilters(new URLSearchParams("m=1")).match).toBe("contains");
  });

  it("reads own=missing as missing-only", () => {
    expect(parseFilters(new URLSearchParams("own=missing")).missingOnly).toBe(true);
  });

  it("reads missing-only as off for anything it does not recognise", () => {
    expect(parseFilters(new URLSearchParams("m=true")).missingOnly).toBe(false);
    expect(parseFilters(new URLSearchParams("own=both")).missingOnly).toBe(false);
  });

  // H10: the commander lanes' key and value.
  it("writes Exactly as m=exact and reads it back", () => {
    const params = serialiseFilters({ ...EMPTY_FILTERS, colors: ["W"], match: "exactly" });
    expect(params.get("m")).toBe("exact");
    expect(parseFilters(params).match).toBe("exactly");
  });

  it("reads Exactly as Any when no recognized colour is lit, and never writes it alone", () => {
    expect(parseFilters(new URLSearchParams("m=exact")).match).toBe("contains");
    expect(parseFilters(new URLSearchParams("m=exact&c=Z")).match).toBe("contains");
    expect(serialiseFilters({ ...EMPTY_FILTERS, match: "exactly" }).has("m")).toBe(false);
  });

  it("writes Any as an absence", () => {
    expect(serialiseFilters({ ...EMPTY_FILTERS, colors: ["W"] }).has("m")).toBe(false);
    expect(parseFilters(new URLSearchParams("c=W")).match).toBe("contains");
  });

  // H13: a list now, in canonical order.
  it("writes several rarities as one comma list in canonical order", () => {
    expect(serialiseFilters({ ...EMPTY_FILTERS, rarities: ["mythic", "rare"] }).get("r"))
      .toBe("rare,mythic");
  });

  it("reads a rarity list whole rather than its first value", () => {
    expect(parseFilters(new URLSearchParams("r=mythic,common")).rarities)
      .toEqual(["common", "mythic"]);
  });

  // Every link written while the control was single-select carries one value.
  it("still reads a single legacy rarity as a list of one", () => {
    expect(parseFilters(new URLSearchParams("r=rare")).rarities).toEqual(["rare"]);
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

// A hand-edited URL is a supported entry point — `parseFilters` is deliberately lenient
// about case and about extra rarities. A combining mark with no base letter survives
// `trim` but folds to nothing, which left `filters.query` set while every control that
// clears it read inactive: a query in the URL with no visible way out.
describe("parseFilters — a query that folds to nothing", () => {
  it("canonicalises a combining-mark-only query to empty", () => {
    expect(parseFilters(new URLSearchParams("q=%CC%81")).query).toBe("");
  });

  it("still canonicalises whitespace", () => {
    expect(parseFilters(new URLSearchParams("q=%20%20")).query).toBe("");
  });

  it("and leaves a real one alone, trimmed", () => {
    expect(parseFilters(new URLSearchParams("q=%20plains%20")).query).toBe("plains");
  });

  // The diacritic itself is not the thing being dropped — only a mark with nothing to
  // attach to. `Jötun` must survive parsing, or the folding search has nothing to fold.
  it("keeps an accented query", () => {
    expect(parseFilters(new URLSearchParams("q=j%C3%B6tun")).query).toBe("jötun");
  });
});
