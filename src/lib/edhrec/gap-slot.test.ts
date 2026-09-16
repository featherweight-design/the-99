import { describe, expect, it } from "vitest";
import type { EdhrecTag } from "./parse";
import {
  GAP_NAME_CAP,
  eligibleMechanics,
  gapSlotFor,
  isMechanic,
  themeFloorFor,
} from "./gap-slot";
import { FORMAT_LABELS, isCreatureTypeLabel, singularForms } from "./tag-kinds";
import { CREATURE_TYPE_LABELS, MECHANIC_LABELS } from "./tag-kinds.generated";

const tag = (label: string, count: number, slug = label.toLowerCase()): EdhrecTag => ({
  label,
  slug,
  count,
});

describe("the generated classification", () => {
  // The counts the generator produced. Pinned so a regeneration that moves the
  // vocabulary is a visible diff rather than a silent one.
  it("covers the whole vocabulary at the measured split", () => {
    expect(MECHANIC_LABELS).toHaveLength(269);
    expect(CREATURE_TYPE_LABELS).toHaveLength(125);
    expect(FORMAT_LABELS).toHaveLength(7);
    expect(MECHANIC_LABELS.length + CREATURE_TYPE_LABELS.length + FORMAT_LABELS.length).toBe(401);
  });

  // The ten dual-role subtypes. Each is a creature subtype on some card —
  // `Artifact Creature — Food Golem` — and something else on hundreds, so a
  // vocabulary taken from the creature half of the type line keeps all ten and
  // hides ten real mechanics.
  it.each([
    "Adventures", "Auras", "Books", "Clues", "Equipment", "Food",
    "Sagas", "Shrines", "Treasure", "Vehicles",
  ])("%s is a mechanic despite also naming a creature subtype", (label) => {
    expect(isMechanic(label)).toBe(true);
  });

  // `Frogs` is Glarb's third-largest theme and still must not reach the reader;
  // `Crocodiles` and `Bears` are the tail the floor removes. All three are
  // creature types, which is the classifier's half of the job.
  it.each(["Frogs", "Crocodiles", "Bears"])("%s never reaches the reader", (label) => {
    expect(isMechanic(label)).toBe(false);
  });

  // Irregular plurals. Every one of these reached the mechanic side of a first
  // attempt, and `Faeries` reached it a second time through `Kindred`.
  it.each(["Dwarves", "Faeries", "Fungi", "Heroes", "Horses"])(
    "%s is recognised as a creature type despite its plural",
    (label) => {
      expect(isMechanic(label)).toBe(false);
      expect(CREATURE_TYPE_LABELS).toContain(label);
    },
  );

  // Real creature types whose EDHREC tag is ambiguous between the tribe and an
  // archetype built around it. The safety asymmetry resolves them to hidden.
  it.each(["Eggs", "Mounts", "Toys"])("%s is hidden rather than guessed at", (label) => {
    expect(isMechanic(label)).toBe(false);
  });

  // Asserted against the MECHANISM as well as the behaviour. Format labels are
  // excluded by the generator, so they are absent from the allowlist — and an
  // `isMechanic` call alone cannot tell that apart from a runtime guard, which
  // is how a redundant one survived here until a mutation run removed it
  // without failing anything.
  it.each([...FORMAT_LABELS])("the format label %s is absent from the allowlist", (label) => {
    expect(MECHANIC_LABELS).not.toContain(label);
    expect(isMechanic(label)).toBe(false);
  });

  // The rule that makes the whole thing safe: absence means hidden.
  it("excludes a label it has never seen", () => {
    expect(isMechanic("Some Theme EDHREC Added Last Tuesday")).toBe(false);
  });

  it("does not mistake a multi-word label containing a creature word", () => {
    const subtypes = new Set(["creature", "sea"]);
    expect(isCreatureTypeLabel("Sea Creatures", subtypes)).toBe(false);
    expect(isMechanic("Sea Creatures")).toBe(true);
    expect(isMechanic("Modified Creatures")).toBe(true);
  });

  it("offers every singular a plural could reduce to", () => {
    expect(singularForms("Faeries")).toContain("faerie");
    expect(singularForms("Wolves")).toContain("wolf");
    expect(singularForms("Frogs")).toContain("frog");
    // "ies" -> "y" for a regular one, without the irregular table.
    expect(singularForms("Allies")).toContain("ally");
  });
});

describe("the theme floor", () => {
  it("is half a percent of the commander's own decks, rounded up", () => {
    expect(themeFloorFor(24054)).toBe(121);
    expect(themeFloorFor(31481)).toBe(158);
    expect(themeFloorFor(200)).toBe(1);
  });

  // A proportion of nothing is not zero, it is undefined — so the floor stands
  // aside and the classifier alone governs.
  it("does not apply where the index carried no deck count", () => {
    expect(themeFloorFor(null)).toBe(0);
    const tags = [tag("Proliferate", 1)];
    expect(eligibleMechanics(tags, null).map((t) => t.label)).toEqual(["Proliferate"]);
  });

  // The reported row: Crocodiles at 2 and Bears at 1 against 24,054 decks.
  // These two need no classifier at all — the floor is what removes them, and
  // it would remove their mechanic equivalents too.
  it("removes the tail the reported row fell into", () => {
    const tags = [
      tag("Lands Matter", 897),
      tag("Reanimator", 761),
      tag("Landfall", 2),
      tag("Proliferate", 1),
    ];
    expect(eligibleMechanics(tags, 24054).map((t) => t.label)).toEqual([
      "Lands Matter",
      "Reanimator",
    ]);
  });
});

describe("gapSlotFor", () => {
  const none = new Set<string>();

  it("names the three most-built unplayed mechanics", () => {
    const slot = gapSlotFor(
      [
        tag("Lands Matter", 897),
        tag("Reanimator", 761),
        tag("Combo", 531),
        tag("Midrange", 396),
      ],
      24054,
      none,
    );
    expect(slot).toEqual({
      kind: "unplayed",
      labels: ["Lands Matter", "Reanimator", "Combo"],
    });
  });

  it("caps the names and never grows past the cap", () => {
    const tags = Array.from({ length: 40 }, (_, i) => tag(`Proliferate${i}`, 900 - i));
    // Not in the allowlist, so nothing is eligible — the cap is asserted below
    // against real labels instead.
    expect(gapSlotFor(tags, 24054, none)).toEqual({ kind: "noMechanics" });

    const real = ["Lands Matter", "Reanimator", "Combo", "Midrange", "Ramp", "Control"].map(
      (l, i) => tag(l, 900 - i),
    );
    const slot = gapSlotFor(real, 24054, none);
    expect(slot.kind).toBe("unplayed");
    if (slot.kind === "unplayed") expect(slot.labels).toHaveLength(GAP_NAME_CAP);
  });

  // The reader plays everything above `Frogs`, which is what produced the
  // reported row. With the classifier and the floor in place the slot has
  // nothing left to name, and the sentence it draws is then TRUE.
  it("reports allPlayed when every eligible mechanic is already built", () => {
    const tags = [
      tag("Lands Matter", 897, "lands-matter"),
      tag("Reanimator", 761, "reanimator"),
      tag("Frogs", 598, "frogs"),
      tag("Crocodiles", 2, "crocodiles"),
    ];
    const played = new Set(["lands-matter", "reanimator"]);
    expect(gapSlotFor(tags, 24054, played)).toEqual({ kind: "allPlayed" });
  });

  // The distinction R1 found. A commander whose every tag is a creature type
  // has an empty mechanic set for a completely different reason, and must not
  // be told it plays every mechanic this commander leans on.
  it("reports noMechanics when the classifier leaves nothing, not allPlayed", () => {
    const tags = [tag("Frogs", 598), tag("Crocodiles", 2), tag("Bears", 1)];
    expect(gapSlotFor(tags, 24054, none)).toEqual({ kind: "noMechanics" });
  });

  it("separates the two empty cases even though both hold no labels", () => {
    const allTribal = gapSlotFor([tag("Frogs", 598)], 24054, none);
    const allBuilt = gapSlotFor([tag("Reanimator", 761, "reanimator")], 24054, new Set(["reanimator"]));
    expect(allTribal.kind).toBe("noMechanics");
    expect(allBuilt.kind).toBe("allPlayed");
    expect(allTribal.kind).not.toBe(allBuilt.kind);
  });

  it("reports noMechanics for a commander the index gave no tags", () => {
    expect(gapSlotFor([], 24054, none)).toEqual({ kind: "noMechanics" });
  });

  // A tag under the floor is not "unplayed", it is not a theme — so a commander
  // whose only unplayed mechanics are accidents reads as allPlayed.
  it("does not let a sub-floor tag keep the slot out of allPlayed", () => {
    const tags = [tag("Reanimator", 761, "reanimator"), tag("Landfall", 2, "landfall")];
    expect(gapSlotFor(tags, 24054, new Set(["reanimator"]))).toEqual({ kind: "allPlayed" });
  });

  // Same comparator as `unplayedTags`, so the line and the list cannot disagree.
  it("breaks a count tie on the slug", () => {
    const slot = gapSlotFor(
      [tag("Reanimator", 500, "reanimator"), tag("Combo", 500, "combo"), tag("Ramp", 500, "ramp")],
      1000,
      none,
    );
    expect(slot).toEqual({ kind: "unplayed", labels: ["Combo", "Ramp", "Reanimator"] });
  });
});
