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
    expect(MECHANIC_LABELS).toHaveLength(260);
    expect(CREATURE_TYPE_LABELS).toHaveLength(134);
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

  // One case per irregular-plural RULE, so deleting a rule fails a case. A hand
  // table of known words was tried here first and was still missing four of
  // these: `Mice` and `Werewolves`, which review found, and `Cybermen` and
  // `Pegasi`, which only a sweep of the whole allowlist against Scryfall's
  // creature types turned up. Each is a regular instance of an irregular
  // pattern, which is why rules replaced the table.
  it.each([
    "Wolves", "Elves", "Dwarves", "Werewolves", // -ves -> -f / -fe
    "Cybermen", // -men -> -man
    "Fungi", "Pegasi", // -i -> -us
    "Mice", // -ice -> -ouse
    "Heroes", // -oes
  ])("%s reduces via an irregular-plural rule and is a creature type", (label) => {
    expect(isMechanic(label)).toBe(false);
    expect(CREATURE_TYPE_LABELS).toContain(label);
  });

  // These reduce from the plain trailing-`s` rule, and are classification
  // guards rather than proofs of any parser branch.
  //
  // `Faeries` was described here as load-bearing for the `Kindred` clause. It
  // is not, and has not been since the vocabulary became a union: Scryfall's
  // catalog supplies `faerie` directly, so removing that clause no longer moves
  // this label. The clause is covered in `tag-kinds.test.ts` instead, which is
  // the only place it can be. Same stale claim as the generator comment, left
  // in a sibling after the original was withdrawn.
  it.each(["Faeries", "Horses", "Humans", "Zombies"])(
    "%s reduces from the plain trailing-s rule and is still a creature type",
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

  // Three tribes a card-derived vocabulary cannot see, each for a different
  // reason, and each allowlisted as a mechanic until the generator took
  // Scryfall's catalogs: `Servo` is token-only and tokens are dropped from
  // `cards`; `Time Lord` is multi-word and whitespace-splitting destroyed it;
  // `Dinosaur` has 231 creature printings and one non-creature line, which an
  // unconditional subtraction was enough to delete it on.
  it.each(["Servos", "Time Lords", "Dinosaurs", "Daleks", "Specters"])(
    "%s is a creature type the card catalog alone could not classify",
    (label) => {
      expect(isMechanic(label)).toBe(false);
      expect(CREATURE_TYPE_LABELS).toContain(label);
    },
  );

  // The gap in the other direction: a real tribe that appears in NO Scryfall
  // subtype catalog, so the authoritative list alone is not sufficient either.
  it("classifies Cephalids, which no Scryfall catalog lists", () => {
    expect(isMechanic("Cephalids")).toBe(false);
    expect(CREATURE_TYPE_LABELS).toContain("Cephalids");
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

  // A property of `singularForms`, not of a guard: it yields whole-label forms
  // only, so a space-bearing label cannot match a single-word subtype. An
  // explicit multi-word guard was written and deleted after a mutation run
  // showed it changed no answer. This asserts the behaviour, which a future
  // `singularForms` that split words would break silently.
  it("cannot match a multi-word label against a single-word subtype", () => {
    const subtypes = new Set(["creature", "sea", "modified"]);
    expect(singularForms("Sea Creatures").every((f) => f.includes(" "))).toBe(true);
    expect(isCreatureTypeLabel("Sea Creatures", subtypes)).toBe(false);
    expect(isMechanic("Sea Creatures")).toBe(true);
    expect(isMechanic("Modified Creatures")).toBe(true);
  });

  // One direct assertion per rule, including the two whose only other coverage
  // is a generator invariant — and the generator is not executed by `pnpm test`,
  // so without these a rule could be removed and the suite would stay green
  // over the stale checked-in artifact.
  it("offers every singular a plural could reduce to", () => {
    expect(singularForms("Foxes")).toContain("fox"); // -(sh|ch|s|x|z)es
    expect(singularForms("Caves")).toContain("cafe"); // -ves, over-reducing
    expect(singularForms("Wolves")).toContain("wolf");
    expect(singularForms("Werewolves")).toContain("werewolf");
    expect(singularForms("Cybermen")).toContain("cyberman");
    expect(singularForms("Fungi")).toContain("fungus");
    expect(singularForms("Pegasi")).toContain("pegasus");
    expect(singularForms("Mice")).toContain("mouse");
    expect(singularForms("Heroes")).toContain("hero");
    expect(singularForms("Frogs")).toContain("frog");
    expect(singularForms("Allies")).toContain("ally");
    expect(singularForms("Faeries")).toContain("faerie");
  });

  // Mechanic labels that each FIRE a plural rule and must still come out
  // mechanics. Unlike the four below, these exercise the rules — an earlier
  // revision used only those four, which end in `g`, `l`, `n` and `r`, fire no
  // rule at all, and so passed with any rule removed.
  //
  // BUT THEY ARE REGRESSION GUARDS, NOT PROOFS THAT A RULE IS SAFE. Over-
  // reduction only misclassifies when the reduced form happens to be a real
  // creature type, and none of these reduces to one (`caves` gives `caf`,
  // `cafe` and `cave`; `curses` gives `curs` and `curse`), so no tweak to those
  // rules can pull them across.
  // The real protection is the pinned counts above: any label changing bucket
  // moves 260/134/7 and fails, anticipated or not.
  //
  // `-men`, `-oes` and `-i` have no case because no mechanic label in the
  // vocabulary ends that way — those rules have nothing to pull across.
  it.each([
    ["Caves", "-ves"],
    ["Sacrifice", "-ice"],
    ["Activated Abilities", "-ies"],
    ["Curses", "-(sh|ch|s|x|z)es"],
    ["Artifacts", "-s"],
  ])("%s fires the %s rule and stays a mechanic", (label) => {
    expect(isMechanic(label)).toBe(true);
    expect(CREATURE_TYPE_LABELS).not.toContain(label);
  });

  // Kept separately, and honestly labelled: these resemble a creature type by
  // PREFIX, which is what the generator's near-miss report flags. They exercise
  // no rule and are a regression guard on the classification, not on the rules.
  it.each(["Cycling", "Surveil", "Prison", "Spellslinger"])(
    "%s resembles a creature type by prefix and is still a mechanic",
    (label) => {
      expect(isMechanic(label)).toBe(true);
    },
  );
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


describe("the floor and the empty states", () => {
  const none = new Set<string>();
  // Real mechanics, real counts, all far below ceil(24054 * 0.005) = 121.
  const subFloor = [
    tag("Reanimator", 3, "reanimator"),
    tag("Landfall", 2, "landfall"),
    tag("Proliferate", 1, "proliferate"),
  ];

  // The distinction round 5 asked for. `noMechanics` means "no mechanic theme
  // worth naming", which is WIDER than "the classifier found nothing": a
  // commander whose mechanic tags all sit under the floor lands here too. Both
  // other answers would be false — the reader plays none of those themes, so
  // `allPlayed` is a lie, and none is nameable, so no label list can be filled.
  // Pinned as current behaviour; the copy for it is a Design question, recorded
  // as a follow-up rather than invented here.
  it("reports noMechanics when every mechanic tag sits under the floor", () => {
    expect(gapSlotFor(subFloor, 24054, none)).toEqual({ kind: "noMechanics" });
  });

  // The same tags with no deck count: the floor stands aside, so they become
  // nameable and the slot has something to say. This is what makes the case
  // above about the FLOOR rather than about the classifier.
  it("names those same tags when there is no deck count to take a floor of", () => {
    expect(gapSlotFor(subFloor, null, none)).toEqual({
      kind: "unplayed",
      labels: ["Reanimator", "Landfall", "Proliferate"],
    });
  });
});
