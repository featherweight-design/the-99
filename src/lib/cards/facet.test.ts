import { describe, it, expect } from "vitest";
import { cardFacet, FACET_TYPE_LABEL } from "./facet";

describe("cardFacet", () => {
  it("buckets the six plain cases", () => {
    expect(cardFacet("Creature — Human Wizard")).toBe("creature");
    expect(cardFacet("Instant")).toBe("spell");
    expect(cardFacet("Sorcery")).toBe("spell");
    expect(cardFacet("Artifact")).toBe("artifact");
    expect(cardFacet("Enchantment")).toBe("enchantment");
    expect(cardFacet("Land")).toBe("land");
  });

  // Gap report 2: the facet answers "what supports this commander", and a
  // creature that is also an artifact is still a creature.
  it("gives a multi-type card its creature bucket first", () => {
    expect(cardFacet("Artifact Creature — Golem")).toBe("creature");
    expect(cardFacet("Enchantment Creature — Boar")).toBe("creature");
    expect(cardFacet("Legendary Creature — Elf Druid")).toBe("creature");
  });

  it("buckets an artifact land as a land", () => {
    expect(cardFacet("Artifact Land")).toBe("land");
    expect(cardFacet("Land — Forest")).toBe("land");
  });

  // A DFC's type line carries both faces; the front face decides.
  it("reads the front face of a double-faced type line", () => {
    expect(cardFacet("Creature — Human // Land")).toBe("creature");
    expect(cardFacet("Land // Instant")).toBe("land");
  });

  it("puts everything with no bucket in other", () => {
    expect(cardFacet("Planeswalker — Teferi")).toBe("other");
    expect(cardFacet("Battle — Siege")).toBe("other");
    expect(cardFacet("")).toBe("other");
  });
});

describe("FACET_TYPE_LABEL", () => {
  // The `All` facet's type column prints this and nothing else, so every bucket
  // needs a singular noun — including `other`, which has no pill of its own but
  // does have rows under `All`.
  it("gives every facet a singular noun for the All facet's type column", () => {
    expect(FACET_TYPE_LABEL[cardFacet("Legendary Creature — Elf Druid")]).toBe("Creature");
    expect(FACET_TYPE_LABEL[cardFacet("Instant")]).toBe("Spell");
    expect(FACET_TYPE_LABEL[cardFacet("Artifact")]).toBe("Artifact");
    expect(FACET_TYPE_LABEL[cardFacet("Enchantment")]).toBe("Enchantment");
    expect(FACET_TYPE_LABEL[cardFacet("Land")]).toBe("Land");
    expect(FACET_TYPE_LABEL[cardFacet("Planeswalker — Teferi")]).toBe("Other");
  });
});
