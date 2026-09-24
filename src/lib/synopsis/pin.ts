import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckProfiles, deckSynopses, deckVersionSynopses } from "../../db/schema";
import { isNewestVersion, type CommitPin } from "../profile/stored";

/**
 * Copy the deck's synopsis into the version a commit just wrote, when it was written for exactly
 * that list (brief §2.4; plan, decision 7). Called from the commit's `after()`, beside the
 * analysis pin, and never anywhere else: a press never pins, so the record line "Written for
 * version 3 when it was committed" is true by construction.
 *
 * INSERT-IF-ABSENT and never updated, so a version's copy is immutable and a later rewrite of the
 * draft cannot reach it. Only the newest version is pinned, checked in the write, so two commits'
 * `after()` pins landing out of order cannot name the wrong one. A commit that moved the list off
 * the synopsis (a stale draft, or a pulled card's automatic commit) finds no matching synopsis and
 * writes nothing.
 *
 * Best-effort: a failure is logged and swallowed, because the commit it follows has already
 * answered the player.
 */
export async function pinSynopsisToVersion(deckId: string, userId: string, pin: CommitPin): Promise<boolean> {
  try {
    const [match] = await db
      .select({ id: deckSynopses.id, fingerprint: deckSynopses.fingerprint })
      .from(deckSynopses)
      .where(and(
        eq(deckSynopses.deckId, deckId),
        eq(deckSynopses.userId, userId),
        eq(deckSynopses.status, "done"),
        sql`${deckSynopses.content} -> 'verdicts' @> '[{"status":"ok"}]'::jsonb`,
      ))
      .orderBy(desc(deckSynopses.createdAt))
      .limit(1);
    // THE DRAFT'S synopsis, then its list: an older run written for this same list (write A, write
    // B, revert to A, commit) is history, not what the player was reading, and is never copied.
    if (!match || match.fingerprint !== pin.list) return false;
    // AND THE DRAFT IS NOT STALE. A synopsis for A, an edit to B and a revert to A leaves the deck
    // dirty: the synopsis reads as stale, and a commit made from a stale draft records none (brief
    // §2.4). The commit's `after()` runs this BEFORE the analysis pin, which may clear `dirty`.
    const [reading] = await db.select({ list: deckProfiles.fingerprint, dirty: deckProfiles.dirty })
      .from(deckProfiles)
      .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)));
    if (!reading || reading.dirty || reading.list !== pin.list) return false;
    const written = await db
      .insert(deckVersionSynopses)
      .select(db
        .select({ versionId: sql<string>`${pin.versionId}::uuid`.as("version_id"), synopsisId: sql<string>`${match.id}::uuid`.as("synopsis_id") })
        .from(sql`(select 1) as one`)
        .where(isNewestVersion(deckId, pin.versionId)))
      .onConflictDoNothing()
      .returning({ versionId: deckVersionSynopses.versionId });
    return written.length > 0;
  } catch (error) {
    console.warn("the committed version's synopsis was not pinned", error);
    return false;
  }
}
