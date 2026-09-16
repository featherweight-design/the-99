// The generator's own logic, over fixtures.
//
// `gap-slot.test.ts` asserts the checked-in artifact, which is necessary and
// not sufficient: a change to the parsing or the exclusion here would leave
// that suite green over a stale artifact nothing had regenerated. These cases
// cover the two pure steps the generator is made of.
import { describe, expect, it } from "vitest";
import {
  classifyLabels,
  creatureSubtypesFromTypeLines,
  FORMAT_LABELS,
  isCreatureTypeLabel,
} from "./tag-kinds";

describe("creatureSubtypesFromTypeLines", () => {
  const none = new Set<string>();

  it("takes subtypes from a creature face and ignores a non-creature one", () => {
    const got = creatureSubtypesFromTypeLines(
      ["Legendary Creature — Frog Wizard", "Artifact — Equipment"],
      none,
    );
    expect([...got].sort()).toEqual(["frog", "wizard"]);
  });

  // The reason the `Kindred`/`Tribal` words are in the predicate at all. On the
  // shipped vocabulary this clause changes no answer, because Scryfall's
  // catalog already holds `faerie` — so this is the only place it is provable.
  it("reads a Kindred face, which bears creature types without being a creature", () => {
    const got = creatureSubtypesFromTypeLines(["Tribal Enchantment — Faerie Aura"], none);
    expect(got.has("faerie")).toBe(true);
  });

  it("reads both halves of a split type line", () => {
    const got = creatureSubtypesFromTypeLines(
      ["Creature — Human Cleric // Creature — Angel"],
      none,
    );
    expect([...got].sort()).toEqual(["angel", "cleric", "human"]);
  });

  // The exclusion is by CATALOG, never by card occurrence. An earlier version
  // subtracted any subtype seen on a non-creature line and deleted `Dinosaur`,
  // which has 231 creature printings and one non-creature one.
  it("excludes a subtype Scryfall files under another card type", () => {
    const lines = ["Artifact Creature — Food Golem", "Creature — Dinosaur"];
    const got = creatureSubtypesFromTypeLines(lines, new Set(["food"]));
    expect(got.has("food")).toBe(false);
    expect(got.has("golem")).toBe(true);
    expect(got.has("dinosaur")).toBe(true);
  });

  it("survives a null type line and a line with no subtypes", () => {
    const got = creatureSubtypesFromTypeLines([null, "Instant", "Creature — Bear"], none);
    expect([...got]).toEqual(["bear"]);
  });

  // Multi-word subtypes are the residual gap, stated in the generator: a phrase
  // is split into words here, so only Scryfall's catalog can supply `time lord`.
  it("splits a multi-word subtype into words, which is why the catalog is needed", () => {
    const got = creatureSubtypesFromTypeLines(["Creature — Time Lord"], none);
    expect(got.has("time lord")).toBe(false);
    expect(got.has("time")).toBe(true);
    expect(isCreatureTypeLabel("Time Lords", got)).toBe(false);
    expect(isCreatureTypeLabel("Time Lords", new Set(["time lord"]))).toBe(true);
  });
});

describe("classifyLabels", () => {
  it("buckets by format, then creature type, then mechanic as the fallback", () => {
    const got = classifyLabels(["cEDH", "Frogs", "Proliferate"], new Set(["frog"]));
    expect(got.format).toEqual(["cEDH"]);
    expect(got.creature).toEqual(["Frogs"]);
    expect(got.mechanic).toEqual(["Proliferate"]);
  });

  // Order is load-bearing: a format label stays a format even when the creature
  // vocabulary happens to contain it, so the format list can never be
  // undermined by an upstream catalog change.
  it("keeps a format label a format even if the creature vocabulary holds it", () => {
    const got = classifyLabels(["cEDH"], new Set(["cedh"]));
    expect(got.format).toEqual(["cEDH"]);
    expect(got.creature).toEqual([]);
  });

  // The fallback direction is the whole safety argument: an unknown label is a
  // mechanic, which the generator then allowlists. That is why a MISclassified
  // tribe is shown rather than hidden, and why the counts are pinned.
  it("falls back to mechanic for a label it cannot place", () => {
    const got = classifyLabels(["Some Theme Added Last Tuesday"], new Set(["frog"]));
    expect(got.mechanic).toEqual(["Some Theme Added Last Tuesday"]);
  });

  it("partitions every label exactly once", () => {
    const labels = ["cEDH", "Frogs", "Proliferate", "Auras", "Mice"];
    const got = classifyLabels(labels, new Set(["frog", "mouse"]));
    const all = [...got.mechanic, ...got.creature, ...got.format];
    expect(all.sort()).toEqual([...labels].sort());
    expect(new Set(all).size).toBe(labels.length);
  });

  it("uses the real format list", () => {
    const got = classifyLabels([...FORMAT_LABELS], new Set());
    expect(got.format).toHaveLength(FORMAT_LABELS.length);
    expect(got.mechanic).toEqual([]);
  });
});
