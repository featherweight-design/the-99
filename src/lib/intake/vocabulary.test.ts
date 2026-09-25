import { describe, expect, it } from "vitest";

import { THIN_DECK_COUNT } from "../profile/fit";
import { TOO_NARROW_BELOW, themeShare, themeVocabulary, type ThemeRow } from "./vocabulary";

const tag = (slug: string, count: number, label = slug) => ({ slug, label, count });
const row = (deckCount: number | null, ...tags: ReturnType<typeof tag>[]): ThemeRow => ({ deckCount, tags });

describe("themeShare", () => {
  it("is the tag's count over the commander's decks", () => {
    expect(themeShare(row(1000, tag("dinosaurs", 620)), "dinosaurs")).toBeCloseTo(0.62);
  });

  it("is null for a commander with no such tag, a null deck count, or a thin sample", () => {
    expect(themeShare(row(1000, tag("elves", 500)), "dinosaurs")).toBeNull();
    expect(themeShare(row(null, tag("dinosaurs", 5)), "dinosaurs")).toBeNull();
    expect(themeShare(row(THIN_DECK_COUNT - 1, tag("dinosaurs", 20)), "dinosaurs")).toBeNull();
    expect(themeShare(row(THIN_DECK_COUNT, tag("dinosaurs", 20)), "dinosaurs")).not.toBeNull();
  });

  it("is null for a tag under the 0.5% floor, an accident rather than a theme", () => {
    expect(themeShare(row(10_000, tag("bears", 49)), "bears")).toBeNull();
    expect(themeShare(row(10_000, tag("bears", 50)), "bears")).toBeCloseTo(0.005);
  });
});

describe("themeVocabulary", () => {
  const backed = (n: number, slug: string, label = slug) =>
    Array.from({ length: n }, () => row(1000, tag(slug, 100, label)));

  it(`offers a tag backed by ${TOO_NARROW_BELOW} commanders and not by fewer`, () => {
    const slugs = themeVocabulary([...backed(TOO_NARROW_BELOW, "dinosaurs"), ...backed(TOO_NARROW_BELOW - 1, "whales")]).map((t) => t.slug);
    expect(slugs).toEqual(["dinosaurs"]);
  });

  it("counts only commanders that can back the theme", () => {
    const rows = [...backed(TOO_NARROW_BELOW - 1, "dinosaurs"), row(10, tag("dinosaurs", 5))];
    expect(themeVocabulary(rows)).toEqual([]);
  });

  it("never offers a format", () => {
    expect(themeVocabulary(backed(10, "cedh", "cEDH"))).toEqual([]);
  });

  it("lists the widest themes first, then by label", () => {
    const rows = [...backed(5, "zombies", "Zombies"), ...backed(9, "elves", "Elves"), ...backed(5, "angels", "Angels")];
    expect(themeVocabulary(rows)).toEqual([
      { slug: "elves", label: "Elves", commanders: 9 },
      { slug: "angels", label: "Angels", commanders: 5 },
      { slug: "zombies", label: "Zombies", commanders: 5 },
    ]);
  });
});
