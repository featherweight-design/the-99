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
export const PROFILE_VERSION = 2;

/*
 * 2 (2026-09-20) — the profile gained a land-capable fact group: `counts.landCapable`,
 *   `landCapableCards`, and `layout` on every `ProfileCard`. That is a new fact group AND a
 *   different rule for what counts as a land drop, which is this constant's own bump
 *   criterion twice over.
 *
 *   Bumping matters more than it looks. The version rides in the FINGERPRINT, so without a
 *   bump a profile cached before this change keeps a fingerprint that still matches and is
 *   served whole — with `counts.landCapable` simply absent. The type says it is a required
 *   number, so every reader would believe it exists and any arithmetic on it yields NaN,
 *   silently, until the cache ages out.
 *
 * 1 — the original.
 */
