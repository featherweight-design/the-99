/**
 * The overview's data check (deck notices plan D11, Hugh's H4). Here rather than in the synopsis
 * module because both of that module's sides need it: the read that marks the overview stale, and
 * the write that must not hand back the overview it marked.
 */
import { and, eq } from "drizzle-orm";

import { db } from "../../db";
import { deckProfiles } from "../../db/schema";
import { readProfileHead } from "../profile/load";
import { noticesEnabled } from "./flag";
import { analyzedOracleIds } from "./log";
import { movedWithin } from "./read";

/**
 * Whether a change log entry touching this deck landed after the overview's reading and at or
 * before the current one (plan D11). The marks alone cannot say so: `seen_seq` moves on every
 * recompute, including one after an edit that was undone, so "the reading's mark is higher" would
 * mark an overview stale when nothing about its cards changed. Counted by H1's own rule
 * (`movedWithin`), bans included: a ban recomputes the reading, so the overview written from the
 * reading before it describes a deck that is no longer there. A rules entry counts once it lies in
 * the window.
 */
export async function overviewDataMoved(
  overviewSeen: number,
  readingSeen: number,
  deck: { analyzed: readonly string[]; commanders: readonly string[] },
): Promise<boolean> {
  return movedWithin(
    { seenSeq: overviewSeen, rulesVersion: 0, analyzedOracleIds: deck.analyzed, commanderOracleIds: deck.commanders },
    { after: overviewSeen, upTo: readingSeen },
  );
}

/**
 * `overviewDataMoved` for a deck, from its stored reading. An EMPTY analyzed list is a legacy row
 * (schema note on `deck_profiles`) and is read as the deck's current list, as the notices read and
 * H1 read it; taken as stored it would hold no card and nothing would ever move.
 */
export async function overviewDataMovedFor(
  deckId: string,
  userId: string,
  overviewSeen: number,
  /** The reader's resolved switches (`requestSwitchEnv`). */
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  // Behind the notices switch: off, no overview is marked stale by data it cannot show.
  if (!noticesEnabled(env)) return false;
  // The reading's marks and the deck's list from ONE snapshot: read apart, an edit or an analysis
  // committing between them pairs a reading with a list it never described.
  const read = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({ seenSeq: deckProfiles.seenSeq, analyzed: deckProfiles.analyzedOracleIds })
      .from(deckProfiles)
      .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)));
    if (!row || overviewSeen >= row.seenSeq) return null;
    const head = await readProfileHead(tx, deckId, userId);
    return head ? { row, head } : null;
  }, { isolationLevel: "repeatable read" });
  if (!read) return false;
  const { row, head } = read;
  return overviewDataMoved(overviewSeen, row.seenSeq, {
    analyzed: row.analyzed.length > 0 ? row.analyzed : analyzedOracleIds(head),
    commanders: [head.commanderOracleId, ...(head.partnerOracleId ? [head.partnerOracleId] : [])],
  });
}
