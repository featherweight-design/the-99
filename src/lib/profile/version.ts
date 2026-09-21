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
export const PROFILE_VERSION = 3;

/*
 * 3 (2026-09-21) — the deck's own role classification moved to the FRONT FACE, and the roles
 *   gained a second count taken over the 99 alone.
 *
 *   Both are corrected classifications rather than new facts. `cards.oracle_text` holds both
 *   faces joined, so a land-backed MDFC had been read as ramp off the whole string — the
 *   defect the role DERIVATION was corrected for and this side never was, leaving the deck's
 *   counts classifying one way and the targets they are compared against the other. 82
 *   commander-legal cards disagree between the two readings.
 *
 *   `excludingCommanders` is the population the measured targets were taken over: EDHREC's
 *   support lists never contain the commander, so a deck led by a draw engine read a phantom
 *   surplus. A profile cached under version 2 carries neither correction and would be served
 *   whole.
 *
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
