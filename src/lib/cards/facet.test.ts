import { describe, it, expect } from "vitest";
import { cardFacet, castFaceText, FACET_TYPE_LABEL, isLandFace, playableAsLand, typeWord, frontFace } from "./facet";

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

describe("isLandFace", () => {
  it("is true for a land", () => {
    expect(isLandFace("Land")).toBe(true);
    expect(isLandFace("Basic Land — Forest")).toBe(true);
    expect(isLandFace("Artifact Land")).toBe(true);
  });

  it("is true for a land creature, which cardFacet buckets as a creature", () => {
    expect(isLandFace("Land Creature — Forest Dryad")).toBe(true);
    expect(cardFacet("Land Creature — Forest Dryad")).toBe("creature");
  });

  it("reads the front face only", () => {
    expect(isLandFace("Creature — Elf // Land")).toBe(false);
    expect(isLandFace("Land // Creature — Elf")).toBe(true);
  });

  it("is false for everything cast from hand", () => {
    expect(isLandFace("Instant")).toBe(false);
    expect(isLandFace("Legendary Creature — Human Wizard")).toBe(false);
  });
});

describe("playableAsLand", () => {
  it("accepts a modal_dfc with a land back", () => {
    expect(playableAsLand("Sorcery // Land", "modal_dfc")).toBe(true);
    expect(playableAsLand("Creature — Shapeshifter Rogue // Land", "modal_dfc")).toBe(true);
  });

  // A transform card is CAST as its front face and flips later. `Ojer Axonil, Deepest Might //
  // Temple of Power` is a creature you cast, never a turn-one land drop, and counting it as a
  // land option is the defect this function exists to prevent.
  it("refuses a transform card with a land back", () => {
    expect(playableAsLand("Legendary Creature — God // Land", "transform")).toBe(false);
    expect(playableAsLand("Artifact // Land", "transform")).toBe(false);
  });

  // THE PATHWAY CASE, and the only shape that reaches the `isLandFace` guard. The transform
  // and single-faced cases stop at the layout check and the Werewolf case stops at the
  // back-face land test, so without this one the guard could be deleted and the suite would
  // stay green.
  it("refuses a modal_dfc whose FRONT is already a land", () => {
    expect(isLandFace("Land // Land")).toBe(true);
    expect(playableAsLand("Land // Land", "modal_dfc")).toBe(false);
  });

  it("refuses a modal_dfc whose back is not a land", () => {
    expect(playableAsLand("Creature — Human // Creature — Werewolf", "modal_dfc")).toBe(false);
  });

  it("refuses a single-faced card", () => {
    expect(playableAsLand("Instant", "normal")).toBe(false);
  });
});

describe("castFaceText", () => {
  it("takes the front half for a modal_dfc", () => {
    expect(castFaceText("Kicker {1}{R}\n//\nEnters tapped.", "modal_dfc")).toBe("Kicker {1}{R}");
  });

  // A transform card is cast as its front face too, so its back text is equally not castable.
  // Scoping this to modal_dfc alone would leave 32 of the 82 land-backed cards still feeding
  // "{T}: Add …" into the ramp patterns.
  it("takes the front half for a transform card", () => {
    expect(castFaceText("Deals 2 damage.\n//\n{T}: Add {R}.", "transform")).toBe("Deals 2 damage.");
  });

  // A split card's halves are BOTH castable, so neither may be dropped.
  it("keeps both halves of a split card", () => {
    expect(castFaceText("Deal 2 damage.\n//\nCounter it.", "split")).toBe(
      "Deal 2 damage.\n//\nCounter it.",
    );
  });

  it("passes a single-faced card and a null through unchanged", () => {
    expect(castFaceText("Draw a card.", "normal")).toBe("Draw a card.");
    expect(castFaceText(null, "modal_dfc")).toBe(null);
  });

  // A two-faced layout whose text carries no separator — the catalog has these — must not
  // silently lose its text to an empty first half.
  it("passes a separator-less two-faced text through unchanged", () => {
    expect(castFaceText("Draw a card.", "modal_dfc")).toBe("Draw a card.");
  });
});

describe("typeWord", () => {
  // H27: the top-off row named both an instant and a sorcery "Spell", the synergy panel's bucket.
  it("names an instant and a sorcery as themselves", () => {
    expect(typeWord("Instant")).toBe("Instant");
    expect(typeWord("Sorcery")).toBe("Sorcery");
    expect(typeWord("Kindred Instant — Elf")).toBe("Instant");
  });
  it("reads the front face of a split or modal card", () => {
    expect(typeWord("Sorcery // Instant")).toBe("Sorcery");
  });
  it("keeps the facet label for every other type", () => {
    expect(typeWord("Legendary Creature — Dwarf")).toBe("Creature");
    expect(typeWord("Artifact")).toBe("Artifact");
    expect(typeWord("Land")).toBe("Land");
  });
});

describe("frontFace", () => {
  it("returns the text before the first separator", () =>
    expect(frontFace("Sorcery // Land")).toBe("Sorcery"));
  it("returns a single-face line whole", () =>
    expect(frontFace("Legendary Creature — Angel Horror")).toBe("Legendary Creature — Angel Horror"));
});
