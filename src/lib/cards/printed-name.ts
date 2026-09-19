// The name to print on a card the reader owns. DB-FREE ON PURPOSE, and that is the whole
// reason it is not in `owned-printings.ts` beside the resolution that produces the field:
// nine `"use client"` components value-import this helper, and that module reaches the
// collection reader. `src/lib/decks/status.ts` states the rule and
// `client-bundle-safety.test.ts` enforces the static half of it; this keeps the spirit as
// well, so no client graph holds a database reader for the sake of one string.

/**
 * The name to caption a commander with: the one printed on the copy the player owns
 * where they own a renamed printing, the oracle name otherwise.
 *
 * `printedNameOf` in the collection reader is the same rule for a `BrowseCard`, whose
 * `printedName` is a required field. Every deck surface carries it OPTIONALLY — the
 * fixtures across the suite build commander literals that never touch the catalog — so
 * this is the one place that absence is read as null, rather than at nine call sites.
 */
export function commanderDisplayName(c: { name: string; printedName?: string | null }): string {
  return c.printedName ?? c.name;
}
