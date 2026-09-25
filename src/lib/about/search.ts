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
