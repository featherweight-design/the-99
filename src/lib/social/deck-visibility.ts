/**
 * Which of a player's decks their friends may see (friend decks handoff, G2): ONE rule, read by both friend reads
 * (`loadFriendDecks` for the Decks tab, `loadFriendDeck` for the page), so a tile and its page can never disagree.
 *
 * Three inputs, all the OWNER's: Settings' "Friends can see my decks" (on by default), its "Include drafts and decks
 * I'm building" (off by default), and the deck's own "Hidden from friends" in its ⋯ menu. Unfinished is a phase, not
 * a count: `New` and `Draft` (no committed version) and `Building` (committed, short of its body size). `Unresolved`
 * is a committed deck at its size, so it is finished here, as `Over`, `To buy` and `Complete` are.
 */
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { decks, userPrefs } from "../../db/schema";
import type { Reader } from "./access";
import { DEFAULT_FRIEND_DECK_PREFS, type FriendDeckPrefs } from "./deck-visibility-rule";

// The rule itself is pure and lives apart, so a client component can draw from it (`deck-visibility-rule.ts`).
export { DEFAULT_FRIEND_DECK_PREFS, friendCanSeeDeck, settingsHideDeck, unfinishedPill, type FriendDeckPrefs } from "./deck-visibility-rule";

/** A player's two Settings rules, or the defaults when they have no prefs row. */
export async function loadFriendDeckPrefs(userId: string, q: Reader = db): Promise<FriendDeckPrefs> {
  const [row] = await q
    .select({ seeDecks: userPrefs.friendsSeeDecks, seeUnfinished: userPrefs.friendsSeeUnfinished })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId));
  return row ?? DEFAULT_FRIEND_DECK_PREFS;
}

/**
 * Writes the reader's own two rules, and only when one changes: the `user_prefs` stamp trigger fires on any UPDATE, and
 * the stamp is what moves a friend's `friendGeneration`, so a no-op write would stale every friend's cached page.
 */
export async function writeFriendDeckPrefs(userId: string, prefs: FriendDeckPrefs): Promise<void> {
  const changed = sql`(${userPrefs.friendsSeeDecks}, ${userPrefs.friendsSeeUnfinished}) is distinct from (${prefs.seeDecks}, ${prefs.seeUnfinished})`;
  // The defaults are what a reader with no row already has: an update of an existing row, never an insert, so writing
  // them back for a reader who has no row inserts nothing and fires no trigger.
  if (prefs.seeDecks === DEFAULT_FRIEND_DECK_PREFS.seeDecks && prefs.seeUnfinished === DEFAULT_FRIEND_DECK_PREFS.seeUnfinished) {
    await db.update(userPrefs).set({ friendsSeeDecks: prefs.seeDecks, friendsSeeUnfinished: prefs.seeUnfinished })
      .where(and(eq(userPrefs.userId, userId), changed));
    return;
  }
  await db
    .insert(userPrefs)
    .values({ userId, friendsSeeDecks: prefs.seeDecks, friendsSeeUnfinished: prefs.seeUnfinished })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { friendsSeeDecks: prefs.seeDecks, friendsSeeUnfinished: prefs.seeUnfinished },
      setWhere: changed,
    });
}

/**
 * The ⋯ menu's Hidden from friends, on the reader's own deck. One statement, the owner in its WHERE, and only when the
 * value changes (the stamp trigger again). Leaves `last_edited_at` alone: hiding is not an edit of the deck. Returns
 * false when no deck of this reader's has that id; an unchanged value is still true.
 */
export async function setDeckHiddenFromFriends(userId: string, deckId: string, hidden: boolean): Promise<boolean> {
  if ((await hideDeckUpdate(userId, deckId, hidden)).length > 0) return true;
  const [mine] = await db.select({ id: decks.id }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  return mine !== undefined;
}

/** The one UPDATE, apart so a test can render its SQL: the flag alone, the owner and the change in its WHERE. */
export function hideDeckUpdate(userId: string, deckId: string, hidden: boolean) {
  return db.update(decks).set({ hiddenFromFriends: hidden })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId), ne(decks.hiddenFromFriends, hidden)))
    .returning({ id: decks.id });
}
