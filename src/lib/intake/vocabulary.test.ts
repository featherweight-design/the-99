import { describe, expect, it } from "vitest";

import { THIN_DECK_COUNT } from "../profile/fit";
import { TOO_NARROW_BELOW, carriesSubtype, rawShare, themeShare, themeVocabulary, tribesFor, type ThemeRow } from "./vocabulary";

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

describe("tribal themes", () => {
  it("reads a creature subtype on any creature face, as a word, a phrase or a kindred type", () => {
    expect(carriesSubtype("Legendary Creature — Dwarf Warrior", ["dwarf"])).toBe(true);
    expect(carriesSubtype("Legendary Creature — Dwarfish Thing", ["dwarf"])).toBe(false);
    expect(carriesSubtype("Legendary Creature — Time Lord Human", ["time lord"])).toBe(true);
    expect(carriesSubtype("Kindred Enchantment — Elf Aura", ["elf"])).toBe(true);
    expect(carriesSubtype("Land — Elf", ["elf"])).toBe(false);
    expect(carriesSubtype("Instant // Legendary Creature — Orc Pirate", ["orc"])).toBe(true);
  });

  it("gives the raw share with no floor, and 0 when untagged", () => {
    expect(rawShare(row(10, tag("dwarves", 8)), "dwarves")).toBeCloseTo(0.8);
    expect(rawShare(row(10), "dwarves")).toBe(0);
    expect(rawShare(row(null, tag("dwarves", 8)), "dwarves")).toBe(0);
  });

  it("takes the tribes from the catalog's creature-type labels, never a list of its own", () => {
    const vocab = [
      { slug: "dwarves", label: "Dwarves", commanders: 9 },
      { slug: "landfall", label: "Landfall", commanders: 90 },
    ];
    const t = tribesFor(["dwarves", "landfall", "unknown"], vocab);
    expect([...t.keys()]).toEqual(["dwarves"]);
    expect(t.get("dwarves")).toContain("dwarf");
  });
});
