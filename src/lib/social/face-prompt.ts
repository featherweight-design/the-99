/**
 * Asking for a signature card once (avatar handoff G4, plan `2026-10-27-signature-card.md`). A reader with no face is
 * asked by Home's first-run row or Home's strip until they pick a card, press Skip or close the strip; any of the three
 * stamps `user_prefs.face_prompt_done_at`, and nothing clears it.
 *
 * The flag lives in `user_prefs`, not `social_profiles`, because `user_prefs` carries the `user_data_touch` stamp
 * trigger Home's cached payload is keyed on: a pick has to retire that payload, and a write to `social_profiles` moves
 * no stamp.
 */
import { eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { userPrefs } from "../../db/schema";

type Writer = Pick<typeof db, "insert">;
type Reader = Pick<typeof db, "select">;

/**
 * Stamps the flag. Written ONLY while it is null: the stamp trigger fires on any UPDATE, a no-op one included, so a
 * second pick would otherwise retire the reader's cached Home and `/decks` for nothing. Apart so a test can render
 * its SQL, and so `setCommander` can run it inside its own transaction.
 */
export function facePromptDoneWrite(userId: string, q: Writer = db) {
  return q
    .insert(userPrefs)
    .values({ userId, facePromptDoneAt: sql`now()` })
    .onConflictDoUpdate({
      target: userPrefs.userId,
      set: { facePromptDoneAt: sql`now()` },
      setWhere: isNull(userPrefs.facePromptDoneAt),
    })
    .returning({ at: userPrefs.facePromptDoneAt });
}

/** Skip, or the strip's ✕: true only for the call that stamped it. */
export async function skipFacePrompt(userId: string): Promise<boolean> {
  return (await facePromptDoneWrite(userId)).length === 1;
}

/** Whether this reader is done being asked. No `user_prefs` row is a reader still to be asked. */
export async function facePromptDone(userId: string, q: Reader = db): Promise<boolean> {
  const rows = await q
    .select({ at: userPrefs.facePromptDoneAt })
    .from(userPrefs)
    .where(eq(userPrefs.userId, userId))
    .limit(1);
  return rows[0]?.at != null;
}
