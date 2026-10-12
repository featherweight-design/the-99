/**
 * When a land may leave a deck (Hugh, 2026-10-12): only when the deck has lands to spare AND no color
 * the land makes is left short. One rule for every engine that cuts a land: Improve my mana's trade
 * and lane 92's basic-land cut both call this, so the two can never disagree about what a deck can spare.
 *
 * "Lands to spare" is the land count against the deck's land target (Mix's land cell, measured, else the
 * flat fallback). A land replaced by another land leaves the count where it was, so only the color half
 * applies to it. "Short" is a color's sources against its Needed (the Mana Balance panel's figure, 0
 * where none is published), read AFTER the change: a land whose color a staple gives back still has to
 * leave that color at or above its Needed. Pure.
 */

export type LandCut = {
  /** Copies of land cards in the deck now. */
  lands: number;
  /** The deck's land target. */
  landTarget: number;
  /** True when a land comes in for it, so the land count does not move. */
  replacedByLand: boolean;
  /** Each color the land going out makes: that color's sources after the change, and its Needed. */
  colors: readonly { sourcesAfter: number; needed: number }[];
};

export function basicCutFair(cut: LandCut): boolean {
  if (!cut.replacedByLand && !(cut.lands > cut.landTarget)) return false;
  return cut.colors.every((c) => c.sourcesAfter >= c.needed);
}
