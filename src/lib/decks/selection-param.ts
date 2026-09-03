/** The `?select=` query parameter: the synergy picks a player carried from a
    commander page into the build. One definition, because three layers read it
    — `/decks` builds the redirect, `/decks/new` renders the form, and
    `createDeck` writes the rows — and a filter that disagreed between them
    would either drop a legitimate pick or forward a crafted one.

    Every layer filters rather than throws. The parameter rode in on a URL the
    player navigated with, and refusing the page would cost them the commander
    choice as well as the picks. `createDeck` re-checks the ids it is handed
    against the catalog regardless: this only establishes the shape. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A deck holds 99 cards beside its commander, so a longer selection cannot
    land in full however it was crafted. Bounding it here keeps a hostile URL
    from widening the `in (…)` array behind the legality check. */
export const MAX_SELECTION = 99;

/** Keeps only uuid-shaped ids, drops repeats, and caps the result at a deck's
    worth. `createDeck` is a directly callable server action, so it applies this
    to its own argument rather than trusting the URL layer to have run first. */
export function sanitizeSelection(ids: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of ids) {
    const id = raw.trim();
    if (UUID_RE.test(id)) seen.add(id.toLowerCase());
    if (seen.size >= MAX_SELECTION) break;
  }
  return [...seen];
}

/** Splits a `select` search param into oracle ids, keeping only uuid-shaped
    ones and dropping repeats. Accepts the array form Next.js produces for a
    repeated parameter. */
export function parseSelectParam(raw: string | string[] | undefined): string[] {
  if (raw === undefined) return [];
  const joined = Array.isArray(raw) ? raw.join(",") : raw;
  return sanitizeSelection(joined.split(","));
}

/** The `&select=…` suffix for a redirect target, or `""` when nothing survived
    the filter — so a zero-selection URL stays byte-identical to the shipped one. */
export function selectParamSuffix(raw: string | string[] | undefined): string {
  const ids = parseSelectParam(raw);
  return ids.length > 0 ? `&select=${encodeURIComponent(ids.join(","))}` : "";
}
