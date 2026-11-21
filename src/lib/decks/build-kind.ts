/** How a new deck is built (guided build, design_handoff_the99_guided_build, call 1): today's free fill, or just the commander. */
export const DECK_BUILD_KINDS = ["free", "empty"] as const;
export type DeckBuildKind = (typeof DECK_BUILD_KINDS)[number];

/** A wire argument is checked, not trusted: `createDeck` is directly callable. */
export function isDeckBuildKind(value: unknown): value is DeckBuildKind {
  return (DECK_BUILD_KINDS as readonly unknown[]).includes(value);
}

/**
 * What `createDeck` accepts: the kinds the build choice draws, and `guided`, the free fill with a guided run started over it (its
 * picker is the guided build's own flow, not this choice). Kept apart so the choice's per-kind records stay what it draws.
 */
export type CreateBuildKind = DeckBuildKind | "guided";
export function isCreateBuildKind(value: unknown): value is CreateBuildKind {
  return value === "guided" || isDeckBuildKind(value);
}
