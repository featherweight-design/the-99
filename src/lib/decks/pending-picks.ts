/**
 * Pending picks: a copy given to a committed deck that does not list the card yet (Move a copy, #2980).
 *
 * `assignCopyFor` refuses a draft-only add on purpose (`claimant-no-longer-asks`: a draft ask must never
 * displace a hard claimant), and a `card_assignments` row counts as a live reservation at once. So the
 * pick waits in `pending_assignments`, which the claim model never reads, and becomes a reservation at the
 * deck's commit. This module owns that lifecycle:
 *
 *   assignPendingFor   writes the pick (the UI PR adds the card to the draft through the existing add path)
 *   applyPendingPicks  the commit converts it, or lets it lapse
 *   assignCopyIn       a later reservation for the card deletes it (assign.ts)
 *   restore / prune    a discard, or the card leaving the draft, deletes it (versions.ts, prune-assignments.ts)
 *
 * LOCK ORDER. `assignCopyFor` takes the per-card advisory lock (`lockCardClaims`) BEFORE the deck row lock;
 * a commit holds the deck lock, so converting a pick from inside it would invert the two. The order is kept
 * by taking the card locks FIRST: a commit's caller calls `lockPendingClaims` before it locks the deck row
 * (`commitDeckVersion`), and passes the ids it locked to `commitVersion` as `pendingLocked`. The commit only
 * converts rows whose card is in that set. A row outside it (written between the caller's read and the deck
 * lock, or a caller that never looked, such as a fresh precon start, which has none) lapses rather than
 * taking an advisory lock under the deck lock. Ids are locked in sorted order, so two commits sharing cards
 * cannot deadlock each other, and a pick waits at most one commit.
 */

import { and, asc, eq, sql } from "drizzle-orm";
import { cardAssignments, deckVersionCards, deckVersions, decks, pendingAssignments } from "../../db/schema";
import { assignCopyIn, lockCardClaims, type AssignRefusal, type DisplacedReservation, type Tx } from "./assign";
import { isUuid } from "../uuid";
import { db } from "../../db";

export type PendingRefusal =
  | AssignRefusal
  /** The deck is a brew: it has no committed version to commit a pick into. */
  | "deck-not-committed"
  /** The deck's newest version already lists the card: that is a reservation (`assignCopyFor`), not a pending pick. */
  | "deck-already-lists-it";

/** What `assignPendingFor` did, for the caller that has to redraw the decks it touched. */
export type PendingReport = {
  /** The single authored reservation the pick deleted, as it stood. */
  displaced?: DisplacedReservation;
  /** The deck a previous pending pick for this card named, when this one replaced it. */
  replacedDeckId?: string;
};

/**
 * Give `deckId` the player's copy of `oracleId` at its next commit. Null when the pick was written, else the
 * named refusal. The caller has established whose collection this is; the DECK is checked here.
 */
export async function assignPendingFor(
  userId: string,
  deckId: string,
  oracleId: string,
  report?: PendingReport,
): Promise<PendingRefusal | null> {
  if (!isUuid(oracleId) || !isUuid(deckId)) return "not-your-deck";
  return db.transaction<PendingRefusal | null>(async (tx) => {
    await lockCardClaims(tx, userId, oracleId);
    return assignPendingIn(tx, userId, deckId, oracleId, report);
  });
}

/** The write, inside a transaction that already holds `lockCardClaims` for the pair. */
export async function assignPendingIn(
  tx: Tx,
  userId: string,
  deckId: string,
  oracleId: string,
  report?: PendingReport,
): Promise<PendingRefusal | null> {
  // The deck row first, locked, as `reservableAsk` does: the newest version is read under it.
  const [deck] = await tx.select().from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .for("update");
  if (!deck) return "not-your-deck";
  const [newest] = await tx.select({
    id: deckVersions.id,
    commanderOracleId: deckVersions.commanderOracleId,
    partnerOracleId: deckVersions.partnerOracleId,
  }).from(deckVersions)
    .where(eq(deckVersions.deckId, deckId))
    .orderBy(sql`${deckVersions.number} desc`)
    .limit(1);
  if (!newest) return "deck-not-committed";
  if (newest.commanderOracleId === oracleId || newest.partnerOracleId === oracleId) return "target-is-commander";
  const [listed] = await tx.select({ quantity: deckVersionCards.quantity }).from(deckVersionCards)
    .where(and(eq(deckVersionCards.versionId, newest.id), eq(deckVersionCards.oracleId, oracleId)));
  if (listed) return "deck-already-lists-it";

  // Supply, as `assignCopyIn` counts it: what the player owns less every copy held as a commander.
  const { rows: [supply] } = await tx.execute<{ giveable: number }>(sql`
    select greatest(
      coalesce((select sum(ci.quantity) from collection_items ci
                where ci.user_id = ${userId} and ci.oracle_id = ${oracleId}), 0)
      - (select count(*) from (
          select distinct on (v.deck_id) v.commander_oracle_id, v.partner_oracle_id
          from deck_versions v join decks d on d.id = v.deck_id
          where d.user_id = ${userId}
          order by v.deck_id, v.number desc
        ) nv
        where nv.commander_oracle_id = ${oracleId} or nv.partner_oracle_id = ${oracleId}),
      0
    )::int as giveable
  `);
  if ((supply?.giveable ?? 0) <= 0) return "no-supply-left";

  // THE ONE CHOICE: a sole authored reservation gives way, as a move does in `assignCopyIn`.
  const [oldest] = await tx.select({
    deckId: cardAssignments.deckId,
    copies: cardAssignments.copies,
    createdAt: sql<string>`${cardAssignments.createdAt}::text`,
  }).from(cardAssignments)
    .where(and(eq(cardAssignments.userId, userId), eq(cardAssignments.oracleId, oracleId)))
    .orderBy(asc(cardAssignments.createdAt), asc(cardAssignments.deckId))
    .limit(1)
    .for("update");
  if (oldest) {
    await tx.delete(cardAssignments).where(and(
      eq(cardAssignments.userId, userId),
      eq(cardAssignments.oracleId, oracleId),
      eq(cardAssignments.deckId, oldest.deckId),
    ));
    if (report) report.displaced = { deckId: oldest.deckId, copies: oldest.copies, createdAt: oldest.createdAt };
  }

  const [prior] = await tx.select({ deckId: pendingAssignments.deckId }).from(pendingAssignments)
    .where(and(eq(pendingAssignments.userId, userId), eq(pendingAssignments.oracleId, oracleId)))
    .for("update");
  if (prior && prior.deckId !== deckId && report) report.replacedDeckId = prior.deckId;
  await tx.insert(pendingAssignments).values({ userId, oracleId, deckId })
    .onConflictDoUpdate({
      target: [pendingAssignments.userId, pendingAssignments.oracleId],
      set: { deckId, copies: 1, createdAt: sql`clock_timestamp()` },
    });
  return null;
}

/**
 * Lock the claims of every card this deck has a pending pick for, in sorted order, and return the ids locked.
 * Call BEFORE taking the deck's row lock (see the header), inside the transaction that will commit.
 */
export async function lockPendingClaims(tx: Tx, userId: string, deckId: string): Promise<Set<string>> {
  const rows = await tx.select({ oracleId: pendingAssignments.oracleId }).from(pendingAssignments)
    .where(and(eq(pendingAssignments.deckId, deckId), eq(pendingAssignments.userId, userId)))
    .orderBy(asc(pendingAssignments.oracleId));
  for (const r of rows) await lockCardClaims(tx, userId, r.oracleId);
  return new Set(rows.map((r) => r.oracleId));
}

/**
 * The commit's half: after the new version's cards are written, every pending pick of the deck either
 * becomes a reservation (the version lists the card and the card's lock is held) or is deleted. A refused
 * conversion (supply gone, a proxy, the card now the deck's commander) lapses silently, as a pick whose
 * card the commit did not list does. Runs under the deck row lock the commit holds.
 */
export async function applyPendingPicks(tx: Tx, deckId: string, versionId: string, locked: ReadonlySet<string>): Promise<void> {
  const picks = await tx.select({ userId: pendingAssignments.userId, oracleId: pendingAssignments.oracleId })
    .from(pendingAssignments)
    .where(eq(pendingAssignments.deckId, deckId))
    .orderBy(asc(pendingAssignments.oracleId));
  for (const pick of picks) {
    if (locked.has(pick.oracleId)) {
      const [listed] = await tx.select({ id: deckVersionCards.oracleId }).from(deckVersionCards)
        .where(and(eq(deckVersionCards.versionId, versionId), eq(deckVersionCards.oracleId, pick.oracleId)));
      if (listed) await assignCopyIn(tx, pick.userId, pick.oracleId, deckId, "set");
    }
    await tx.delete(pendingAssignments).where(and(
      eq(pendingAssignments.userId, pick.userId),
      eq(pendingAssignments.oracleId, pick.oracleId),
    ));
  }
}

/** A discard: the draft is the version again, so every pick waiting on it is over. */
export async function clearPendingPicks(tx: Tx, deckId: string): Promise<void> {
  await tx.delete(pendingAssignments).where(eq(pendingAssignments.deckId, deckId));
}
