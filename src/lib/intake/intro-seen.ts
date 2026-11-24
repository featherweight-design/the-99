import { eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";

type Writer = Pick<typeof db, "insert">;

/**
 * Help me choose's intro (handoff `design_handoff_the99_help_me_choose/addendum-intro`, Q1 A and G1): open on every
 * visit until the reader's first Find commanders, folded from then on. History lists only runs that read words, so it
 * cannot tell; this per-account mark can. Set on the first submit of any kind and on the intro's Hide.
 */

/** When this reader was done with the intro (`user_prefs.choose_intro_seen_at`), or null. No row reads as never. */
export async function readChooseIntroSeen(userId: string): Promise<Date | null> {
  const rows = await db
    .select({ seenAt: userPrefs.chooseIntroSeenAt })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId))
    .limit(1);
  return rows[0]?.seenAt ?? null;
}

/**
 * Marks the intro seen. Written ONLY while the column is null: `user_prefs` carries the `user_data_touch` stamp trigger
 * (0123), which fires on any UPDATE, a no-op one included, so every later submit would otherwise retire the reader's
 * cached Home and `/decks` for nothing. Apart so a test can render its SQL.
 */
export function markChooseIntroSeenWrite(userId: string, q: Writer = db) {
  return q
    .insert(userPrefs)
    .values({ userId, chooseIntroSeenAt: sql`now()` })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { chooseIntroSeenAt: sql`now()` },
      setWhere: isNull(userPrefs.chooseIntroSeenAt),
    })
    .returning({ seenAt: userPrefs.chooseIntroSeenAt });
}

/** Marks the intro seen for this reader: true only for the one call that wrote the mark. */
export async function markChooseIntroSeen(userId: string): Promise<boolean> {
  return (await markChooseIntroSeenWrite(userId)).length === 1;
}
