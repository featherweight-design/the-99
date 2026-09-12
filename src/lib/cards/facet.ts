export type CardFacet =
  | "creature"
  | "spell"
  | "artifact"
  | "enchantment"
  | "land"
  | "other";

/** The coarse bucket the synergy panel's facet strip groups on. Not the type
 *  line: the `All` facet prints this alone, and the strip counts rows by it.
 *
 *  Checked in precedence order, because most cards carry more than one type.
 *  Creature wins outright (handoff gap report 2: a creature that is also an
 *  artifact is still a creature). Land beats artifact and enchantment, because
 *  an artifact land is a land in play. Planeswalkers and battles have no facet
 *  of their own and fall to `other` rather than earning a pill of two rows.
 *
 *  A DFC's type line is "Front // Back" and only the front face is played from
 *  hand, so the back is not consulted. */
export function cardFacet(typeLine: string): CardFacet {
  const front = typeLine.split(" // ")[0].toLowerCase();
  if (front.includes("creature")) return "creature";
  if (front.includes("land")) return "land";
  if (front.includes("instant") || front.includes("sorcery")) return "spell";
  if (front.includes("artifact")) return "artifact";
  if (front.includes("enchantment")) return "enchantment";
  return "other";
}

/**
 * Whether the card is played as a land rather than cast for mana.
 *
 * DELIBERATELY NOT `cardFacet(typeLine) === "land"`, and the two answer
 * different questions. `cardFacet` buckets a row for a grouping strip and puts
 * a land creature — Dryad Arbor, `Land Creature — Forest Dryad` — under
 * creature, because that is the pill a player looks for it under. This one
 * decides whether a card contributed a mana value to a curve or an average, and
 * a land creature did not: it was played as a land.
 *
 * The FRONT FACE only, for the same reason `cardFacet` reads it: that is the
 * face played from hand, so a `Creature // Land` back does not drop a creature
 * out of the curve. Both live in this file so the two answers are visibly
 * different rather than accidentally divergent.
 */
export function isLandFace(typeLine: string): boolean {
  return /\bland\b/.test(typeLine.split(" // ")[0].toLowerCase());
}

/** The singular noun `SynergyRow` prints in its type column when the panel is
 *  on the `All` facet — property table Slot 3, "Content (`All` facet): Card
 *  type bucket only, e.g. 'Creature'". Under any single facet the row prints
 *  the card's real type line instead, because the bucket would then repeat the
 *  pill above it.
 *
 *  Deliberately not in `synergyCopy`: the handoff's copy file has no key for
 *  these, and they are the game's type nouns rather than product voice. */
export const FACET_TYPE_LABEL: Record<CardFacet, string> = {
  creature: "Creature",
  spell: "Spell",
  artifact: "Artifact",
  enchantment: "Enchantment",
  land: "Land",
  other: "Other",
};
