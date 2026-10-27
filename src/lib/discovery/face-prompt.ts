/**
 * Asking for a signature card once (avatar handoff G4, plan `2026-10-27-signature-card.md`). A reader with no face is
 * asked by Home's first-run row or Home's strip until they pick a card, press Skip or close the strip; any of the three
 * stamps `user_prefs.face_prompt_done_at`, and nothing clears it.
 *
 * The flag lives in `user_prefs`, not on the player's friends profile, because `user_prefs` carries the
 * `user_data_touch` stamp trigger Home's cached payload is keyed on: a pick has to retire that payload, and a write to
 * the profile moves no stamp. It lives here, beside the tour's flag, and not in `src/lib/social/`, because it reads no
 * social table: Home imports it, and a social module on Home's path must key a friend generation it has no use for.
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

/**
 * Where Home asks (calls 4, 5), pure. The first-run row: to do until a pick or Skip, and once picked it stays, done.
 * The dashboard strip: no face and never asked. Neither with no ask at all (the switch off, or a read that failed).
 */
export function faceAskPlaces(ask: { hasFace: boolean; done: boolean } | null): { row: boolean; strip: boolean } {
  if (!ask) return { row: false, strip: false };
  return { row: ask.hasFace || !ask.done, strip: !ask.hasFace && !ask.done };
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
