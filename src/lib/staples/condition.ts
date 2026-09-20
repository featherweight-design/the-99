/**
 * The condition vocabulary — the bucket a staples floor and an identity composition are
 * keyed on.
 *
 * ONE DEFINITION, because these are PERSISTED KEYS. The derivation writes them and the
 * profile reader looks them up, and the two must produce the same string by construction
 * rather than by both happening to be written the same way. An earlier draft had the spec
 * documenting `'WU'` while the helper sorted to `'UW'`; nothing would have failed loudly —
 * the reader would simply have found no row, every time, for every two-colour deck.
 *
 * Pure: no database, client-safe.
 */

/**
 * A commander's exact colour identity, as a bucket key: letters ALPHABETICAL, `'C'` for
 * colourless.
 *
 * Alphabetical rather than WUBRG. Both are defensible in the abstract; what settles it is
 * that `measure-staples.mts` derived the ratified floors under `array_to_string` over
 * Scryfall's own arrays, which are stored alphabetically — so alphabetical is the spelling
 * the published figures were measured under, and any other choice would silently re-key
 * every one of them.
 */
export function identityCondition(colors: readonly string[]): string {
  return colors.length === 0 ? "C" : [...colors].sort().join("");
}

/**
 * The fallback bucket for an identity too thin to carry a floor of its own.
 *
 * Fifteen of the 32 exact identities clear the 100-commander bar — every mono and every
 * two-colour one, covering 2,735 of 3,279 commanders. The 17 that do not are colourless
 * (46 commanders) and every three-plus identity. Colour COUNT is sound there precisely
 * because the ceiling that broke it at mono and two colours has stopped binding: white is
 * 6 of the 10 three-colour identities, so a white staple clears the three-colour fallback
 * at 0.616 share where under `count:1` it could never pass 0.20.
 */
export function countCondition(colorCount: number): string {
  return `count:${colorCount}`;
}

/** Whether a stored condition is a `count:` fallback rather than an exact identity. */
export function isCountCondition(condition: string): boolean {
  return condition.startsWith("count:");
}

/**
 * The bar an identity bucket must clear to carry a floor of its own.
 *
 * Stated as a constant with its own honest caveat: the spec defends the EXISTENCE of this bar
 * — at 46 commanders the colourless bucket yields 105 cards and at 16 the four-colour buckets
 * yield 51, both longer than any real floor — but nothing measured distinguishes 100 from 50
 * or 200. It is a convention, and calling it anything else would be the unsourced-constant
 * failure §4A exists to correct.
 */
export const MIN_COMMANDERS_PER_CONDITION = 100;
