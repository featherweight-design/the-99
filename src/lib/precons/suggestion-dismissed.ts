import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";

type Writer = Pick<typeof db, "insert">;

/** The key one deck and one precon share in `user_prefs.precon_suggestions_dismissed`: a different precon crossing the
 *  rule later can still suggest. A deck id is a uuid and never reused, so a key for a deleted deck is inert. */
export function suggestionDismissKey(deckId: string, fileName: string): string {
  // A uuid is accepted in either case and the database hands back lowercase: the key is always lowercase, so a deck
  // opened at an uppercase URL finds what the lowercase one saved.
  return `${deckId.toLowerCase()}:${fileName}`;
}

/** The precons left once the ones this reader closed for this deck are dropped. */
export function dropDismissed<T extends { fileName: string }>(matches: readonly T[], closed: ReadonlySet<string>): T[] {
  return matches.filter((m) => !closed.has(m.fileName));
}

/** The precons this reader closed the suggestion for on this deck, by file name. No row reads as none. */
export async function readDismissedSuggestions(userId: string, deckId: string): Promise<Set<string>> {
  const rows = await db
    .select({ dismissed: userPrefs.preconSuggestionsDismissed })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId))
    .limit(1);
  const prefix = `${deckId.toLowerCase()}:`;
  return new Set((rows[0]?.dismissed ?? []).filter((k) => k.startsWith(prefix)).map((k) => k.slice(prefix.length)));
}

/**
 * Records suggestions as closed. Append-only, and it writes ONLY when it adds a key: `user_prefs` carries the
 * `user_data_touch` stamp trigger (0123), which fires on any UPDATE, a no-op one included, so a repeat close would
 * otherwise retire the reader's cached Home and `/decks` for nothing. Apart so a test can render its SQL.
 */
export function dismissSuggestionsWrite(userId: string, keys: string[], q: Writer = db) {
  return q
    .insert(userPrefs)
    .values({ userId, preconSuggestionsDismissed: keys })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: {
        preconSuggestionsDismissed: sql`array(select distinct unnest(${userPrefs.preconSuggestionsDismissed} || excluded.precon_suggestions_dismissed))`,
      },
      setWhere: sql`not (excluded.precon_suggestions_dismissed <@ ${userPrefs}.precon_suggestions_dismissed)`,
    });
}
