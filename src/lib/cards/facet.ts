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

/**
 * Whether the card COULD be played as a land, though its front face is not one.
 *
 * The third land answer in this file, and a different question from both of its neighbours.
 * `cardFacet` buckets a row for a grouping strip. `isLandFace` decides whether a card
 * contributed a mana value to a curve. This one decides whether the card can take a LAND DROP,
 * which is what the fill needs before it decides how many lands to add.
 *
 * `layout` IS THE TEST, never the type line. 50 catalog rows are `modal_dfc` and 32 are
 * `transform`; both read `Something // Land`, and only the first can be played as a land from
 * hand. A `transform` card is cast as its front face and flips later, so `Ojer Axonil, Deepest
 * Might // Temple of Power` is a creature you cast, never a turn-one land drop. A `type_line`
 * test cannot see that difference, and counting those 32 as land-capable would have shipped.
 *
 * Returns FALSE when the front face is already a land — the Pathway cycle, `Land // Land`. That
 * card is counted by `isLandFace`, and a card counted by both would be added twice wherever the
 * two are summed.
 */
export function playableAsLand(typeLine: string, layout: string): boolean {
  if (layout !== "modal_dfc") return false;
  if (isLandFace(typeLine)) return false;
  const faces = typeLine.split(" // ");
  if (faces.length < 2) return false;
  return /\bland\b/.test(faces[1].toLowerCase());
}

/** How `scryfall/transform.ts` joins a multi-faced card's two oracle texts. */
const FACE_SEPARATOR = "\n//\n";

/**
 * The text of the spell you actually CAST.
 *
 * THE CANONICAL READING FOR ROLE CLASSIFICATION, on both sides of it: the derivation
 * (`classifyCards` in `edhrec/role-targets.ts`) and the deck's own counts (`rolesOf` in
 * `profile/build.ts`). Those two are compared against each other, so a caller classifying
 * roles off raw `oracle_text` puts a surplus on the board that is an artefact of the two
 * sides disagreeing about which face to read.
 *
 * `classifyRoles` itself still takes whatever text it is handed — it is given a face, it does
 * not pick one — so a NEW role-classifying caller has to route through here deliberately.
 *
 * `cards.oracle_text` holds BOTH FACES, joined by `FACE_SEPARATOR` in `scryfall/transform.ts`,
 * and `isLandFace` reads the front — so for a land-backed MDFC it returns false and
 * `classifyRoles` then reads the land back's `{T}: Add {R}` and calls the card RAMP. 82
 * commander-legal cards are shaped that way, and the inflation is measurable: the mean derived
 * ramp target reads 8.5 on whole text against 7.8 on the front face, and the commanders
 * measuring exactly zero wipes rise from 369 to 390 once the back faces stop contributing.
 *
 * Worse than a wrong average: a card read as ramp off its land back would be spent on the ramp
 * floor AND counted against the land target, taking two slots' worth of credit for one card.
 *
 * `transform` is here as well as `modal_dfc` because both are cast as their front face; the
 * back arrives later or never. Scoping this to `modal_dfc` alone leaves 32 of the 82 still
 * inflating the figure, `Growing Rites of Itlimoc` and both Ojers among them.
 *
 * SPLIT, ADVENTURE and PREPARE are excluded deliberately: both halves are castable, so dropping
 * the second would lose a real mode.
 *
 * DELIBERATELY NOT a change to `classifyRoles`. That function is read by the commander score and
 * by surfaces this work does not touch, and moving it would move figures nobody asked to move.
 */
export function castFaceText(oracleText: string | null, layout: string): string | null {
  if (oracleText === null) return null;
  if (layout !== "modal_dfc" && layout !== "transform") return oracleText;
  const halves = oracleText.split(FACE_SEPARATOR);
  // A two-faced layout whose stored text carries no separator keeps its text whole rather than
  // resolving to an empty first half.
  return halves.length < 2 ? oracleText : halves[0];
}

/**
 * The type word a row prints in its own type column (H27, Hugh's walk). The same as the facet's
 * label, except that an instant or a sorcery names itself: the facet's merged `Spell` is the
 * synergy panel's bucket for its `All` pill, and a list with no facet strip has no reason to hide
 * which of the two a card is. The front face only, as `cardFacet` reads it.
 */
export function typeWord(typeLine: string): string {
  const front = typeLine.split(" // ")[0].toLowerCase();
  const facet = cardFacet(typeLine);
  if (facet === "spell") return front.includes("instant") ? "Instant" : "Sorcery";
  return FACET_TYPE_LABEL[facet];
}
