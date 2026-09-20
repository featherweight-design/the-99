/**
 * The profile builder's own version, folded into every fingerprint.
 *
 * Bumped when the BUILDER'S MEANING changes — a new fact group, a corrected classification, a
 * different rule for what counts as a land. Not for a refactor that produces identical output.
 *
 * It is in the fingerprint rather than the cache key because it is an input to the profile
 * the same way the decklist is: a profile built by an older builder describes the same deck
 * differently, and a reader cannot tell the two apart from the outside. `prompt-version.ts`
 * in the tuning plan is the precedent.
 */
export const PROFILE_VERSION = 1;
