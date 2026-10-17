// The contents search (About R6 §R). It reads entry TITLES only, and it filters
// the contents list only: nothing here knows the page exists, which is how
// ruling 4 (the page is never hidden, collapsed or reordered) is kept by
// construction rather than by care.

/** A title split around the first match, so the matched run can be drawn apart. */
export type TitleMatch =
  | { matched: false }
  | { matched: true; before: string; hit: string; after: string };

/**
 * Case-insensitive, plain substring. Never a RegExp: a reader typing `(v2` or
 * `+1` is searching for those characters, and a pattern built from their input
 * would throw or match something else.
 */
export function matchTitle(title: string, query: string): TitleMatch {
  const q = query.trim();
  if (!q) return { matched: false };
  // Not `toLocaleLowerCase`: in a Turkish locale `I` folds to dotless `ı`, and
  // `i` would stop finding `Import a collection`.
  const at = title.toLowerCase().indexOf(q.toLowerCase());
  if (at < 0) return { matched: false };
  return {
    matched: true,
    before: title.slice(0, at),
    hit: title.slice(at, at + q.length),
    after: title.slice(at + q.length),
  };
}

export type SearchableChapter<E extends { title: string }> = { entries: readonly E[] };

/**
 * The chapters that still hold a match, each carrying only its matching
 * entries, plus the counts the field prints (`m of n`). A chapter with no match
 * drops out of the LIST; its section on the page is untouched.
 */
export function filterChapters<E extends { title: string }, C extends SearchableChapter<E>>(
  chapters: readonly C[],
  query: string,
): { chapters: (C & { entries: E[] })[]; count: number; total: number } {
  const total = chapters.reduce((n, c) => n + c.entries.length, 0);
  const kept = chapters
    .map((c) => ({ ...c, entries: c.entries.filter((e) => matchTitle(e.title, query).matched) }))
    .filter((c) => c.entries.length > 0);
  return { chapters: kept, count: kept.reduce((n, c) => n + c.entries.length, 0), total };
}

/** Which part of an entry a text search matched first: its title, a line of its caption, or one of its keys. */
export type EntryField = "title" | "caption" | "key";

export type EntryHit<E> = { entry: E; field: EntryField; before: string; hit: string; after: string };

/**
 * Search over every entry's text (discovery R2, E12): the title, then the caption, then the keys, each read from the
 * RESOLVED entry `visibleEntries` returns, so a caption or key line its switch strips is never matched. An entry is
 * hit once, by the first field that holds the query, and that field is split around the match so the word can be
 * marked. The order of `entries` is kept. Plain substring, case-insensitive, like `matchTitle`; never a RegExp.
 *
 * The shipped contents search (`matchTitle`, `filterChapters`) reads titles only and stays as it is until the old
 * page is retired (plan R2·7).
 */
export function searchEntries<E extends { title: string; caption: string; keys: readonly string[] }>(
  entries: readonly E[],
  query: string,
): EntryHit<E>[] {
  const out: EntryHit<E>[] = [];
  for (const entry of entries) {
    const fields: [EntryField, string][] = [
      ["title", entry.title],
      ["caption", entry.caption],
      ...entry.keys.map((k): [EntryField, string] => ["key", k]),
    ];
    for (const [field, text] of fields) {
      const m = matchTitle(text, query);
      if (m.matched) {
        out.push({ entry, field, before: m.before, hit: m.hit, after: m.after });
        break;
      }
    }
  }
  return out;
}
