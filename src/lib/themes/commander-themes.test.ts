import { describe, expect, it } from "vitest";
import {
  buildCommanderThemes,
  fileThemes,
  hasThemes,
  laneThemes,
  normalizeThemeSlugs,
  themeKind,
  THEME_FILTER_MIN_DECKS,
} from "./commander-themes";
import { withThemes } from "../discovery/window";

const row = (oracle_id: string, label: string, slug: string, count: number) => ({ oracle_id, slug, label, count });

describe("themeKind", () => {
  it("names a mechanic, a creature type, and nothing for a format or an unknown label", () => {
    expect(themeKind("+1/+1 Counters")).toBe("mechanic");
    expect(themeKind("Elves")).toBe("typal");
    expect(themeKind("cEDH")).toBeNull();
    expect(themeKind("Not A Real Theme")).toBeNull();
  });
});

describe("normalizeThemeSlugs", () => {
  it("lower-cases, de-duplicates, sorts and drops what is not an EDHREC slug", () => {
    expect(normalizeThemeSlugs(["Tokens", " aristocrats ", "tokens", "", "a b", "-x", "x-"])).toEqual(["aristocrats", "tokens"]);
  });
});

describe("buildCommanderThemes", () => {
  const rows = [
    row("a", "+1/+1 Counters", "counters", 500),
    row("b", "+1/+1 Counters", "counters", THEME_FILTER_MIN_DECKS),
    row("c", "+1/+1 Counters", "counters", THEME_FILTER_MIN_DECKS - 1),
    row("a", "Elves", "elves", 90),
    row("a", "cEDH", "cedh", 4000),
    row("a", "Mystery", "mystery", 4000),
  ];

  it("applies the floor, drops formats and unknown labels, and orders by commanders then slug", () => {
    const t = buildCommanderThemes(rows);
    expect(t.themes).toEqual([
      { slug: "counters", label: "+1/+1 Counters", typal: false },
      { slug: "elves", label: "Elves", typal: true },
    ]);
    expect(t.byOracle).toEqual({ a: [0, 1], b: [0] });
    expect(t.byOracle.c).toBeUndefined();
  });

  it("is empty for no rows", () => {
    expect(buildCommanderThemes([])).toEqual({ themes: [], byOracle: {} });
  });
});

describe("laneThemes and the row test", () => {
  const index = buildCommanderThemes([
    row("a", "+1/+1 Counters", "counters", 500),
    row("a", "Elves", "elves", 90),
    row("b", "Elves", "elves", 90),
    row("z", "Goblins", "goblins", 90),
  ]);

  it("ships only themes its rows have, aligned by position", () => {
    const lane = laneThemes(["b", "a", "unknown"], index);
    expect(lane.themes.map((t) => t.slug)).toEqual(["elves", "counters"]);
    expect(lane.rows).toEqual([[0], [0, 1], []]);
  });

  it("files slugs per row key and tests Any and All", () => {
    const lane = laneThemes(["b", "a", "unknown"], index);
    const by = fileThemes(new Map(), ["slug-b", "slug-a", "slug-u"], lane);
    expect(by.get("slug-a")).toEqual(["elves", "counters"]);
    expect(hasThemes(by, "slug-a", [], "any")).toBe(true);
    expect(hasThemes(by, "slug-b", ["counters", "elves"], "any")).toBe(true);
    expect(hasThemes(by, "slug-b", ["counters", "elves"], "all")).toBe(false);
    expect(hasThemes(by, "slug-a", ["counters", "elves"], "all")).toBe(true);
    expect(hasThemes(by, "slug-u", ["elves"], "any")).toBe(false);
    expect(hasThemes(by, "never-filed", ["elves"], "any")).toBe(false);
  });

  it("withThemes applies the selection to rows by slug, and not at all with no index", () => {
    const lane = laneThemes(["b", "a"], index);
    const by = fileThemes(new Map(), ["slug-b", "slug-a"], lane);
    const rows = [{ slug: "slug-a" }, { slug: "slug-b" }];
    expect(withThemes(rows, by, ["counters"], "any")).toEqual([{ slug: "slug-a" }]);
    expect(withThemes(rows, by, [], "any")).toBe(rows);
    expect(withThemes(rows, null, ["counters"], "any")).toBe(rows);
  });
});
