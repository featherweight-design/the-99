import type { PoolCard } from "./score";

const BASIC_TYPES: Record<string, string> = {
  plains: "W", island: "U", swamp: "B", mountain: "R", forest: "G",
};
const ALL_COLORS = ["W", "U", "B", "R", "G"];
// Bounded to a single clause rather than a character window: the distance
// between "add" and "any color" varies with the rider ("...in your commander's
// color identity", "...that a land an opponent controls could produce"), and a
// fixed cap silently drops whichever riders happen to run long. "any one color"
// is the same grant phrased differently.
export const ANY_COLOR = /\badd\b[^.\n]*\bany (?:one )?color\b/;

/**
 * Which colours a set of lands can actually produce.
 *
 * #215 needs this because legality and playability diverge completely in the
 * motivating deck: 34 Swamps clear every black-inclusive colour identity on
 * legality, including Dimir, while being unable to cast a single blue spell.
 *
 * Deliberately binary. Counting sources and judging whether a manabase is
 * *adequate* is a real deckbuilding model that would need tuning against decks
 * we do not have — the same confident nonsense the intake declined on
 * redundancy scoring. "Can these lands make this colour at all" is defensible
 * from data; "is this manabase good enough" is not, yet.
 *
 * Members are plain strings, matching cards.color_identity's text[] so the
 * subset check against a candidate's identity needs no conversion.
 */
export function producibleColors(
  lands: Pick<PoolCard, "typeLine" | "oracleText">[],
): Set<string> {
  const colors = new Set<string>();

  for (const land of lands) {
    // BOTH faces, unlike everywhere else in this foundation: Agadeem's Awakening
    // is a black sorcery whose BACK face is the land that taps for {B}. Reading
    // the front face only would report no black source from a black source.
    const typeLine = land.typeLine.toLowerCase();
    const text = (land.oracleText ?? "").toLowerCase();

    for (const [basic, color] of Object.entries(BASIC_TYPES)) {
      if (typeLine.includes(basic)) colors.add(color);
    }

    if (!typeLine.includes("land")) continue;

    if (ANY_COLOR.test(text)) {
      for (const c of ALL_COLORS) colors.add(c);
      continue;
    }

    // Only symbols in an "add …" clause. A fetchland's text names Island and
    // Swamp but produces no mana; a land that costs {B} to activate something
    // is not thereby a black source.
    for (const clause of text.matchAll(/\badd\b([^.\n]*)/g)) {
      for (const symbol of clause[1].matchAll(/\{([wubrg])\}/g)) {
        colors.add(symbol[1].toUpperCase());
      }
    }
  }

  return colors;
}
