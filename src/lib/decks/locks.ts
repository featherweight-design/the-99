import { sql } from "drizzle-orm";
import { db } from "../../db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Anything that can run one statement: a transaction, or the db singleton (the probe's). */
type Runner = Pick<Tx, "execute">;

/**
 * The cards this deck has locked, NOW: a live row (`removed_at is null`) whose card is still a
 * `deck_cards` row. For a caller inside its own transaction that is about to cut something, after
 * the deck row lock where it takes one: every enforcement point is a filter over this set (D4).
 *
 * It does not swallow a failure. A filter that read "no locks" on a failed query would cut the
 * card the player said never to cut, so the caller's transaction fails instead.
 */
export async function liveLockedIds(tx: Runner, deckId: string): Promise<ReadonlySet<string>> {
  const result = await tx.execute<{ oracle_id: string }>(sql`
    select l.oracle_id
    from deck_locks l
    where l.deck_id = ${deckId}
      and l.removed_at is null
      and exists (
        select 1 from deck_cards dc
        where dc.deck_id = l.deck_id and dc.oracle_id = l.oracle_id
      )
  `);
  return new Set(result.rows.map((r) => r.oracle_id));
}

/**
 * The same set for a DISPLAY read, scoped to the reader's own deck, in `proxiedOracleIds`'s shape.
 * `"empty"` degrades to "no locks", which draws the deck as it read before the feature existed;
 * `"throw"` is for a caller authorizing something that takes a card out of a deck.
 */
export async function lockedOracleIds(
  deckId: string,
  userId: string,
  onError: "empty" | "throw" = "empty",
): Promise<ReadonlySet<string>> {
  // try/catch around the call, not only `.catch`: a synchronous throw never reaches a rejection
  // handler (the reason `proxiedOracleIds` states).
  try {
    const result = await db.execute<{ oracle_id: string }>(sql`
      select l.oracle_id
      from deck_locks l
      join decks d on d.id = l.deck_id
      where l.deck_id = ${deckId}
        and d.user_id = ${userId}
        and l.removed_at is null
        and exists (
          select 1 from deck_cards dc
          where dc.deck_id = l.deck_id and dc.oracle_id = l.oracle_id
        )
    `);
    return new Set(result.rows.map((r) => r.oracle_id));
  } catch (err) {
    if (onError === "throw") throw err;
    return new Set<string>();
  }
}

/**
 * Leave DORMANT every live lock whose card this deck no longer holds.
 *
 * Beside every `pruneOrphanProxies`, and a reconcile for the same reason that one is: several
 * callers replace the whole list, so "which lock has no membership NOW" is the only question that
 * is always right. Dormant rather than deleted, because the lock ends only if the removal STAYS
 * (L1): a discard revives it (and Undo and Put back will, from Locked PR 5), and a commit deletes it
 * (`clearDormantLocks`).
 * Every other way back arrives unlocked, through the `deck_cards` insert trigger.
 *
 * `prune-proxies.test.ts` fails when a `delete(deckCards)` appears without one of these beside it.
 */
export async function pruneOrphanLocks(tx: Runner, deckId: string): Promise<void> {
  await tx.execute(sql`
    update deck_locks l
    set removed_at = now()
    where l.deck_id = ${deckId}
      and l.removed_at is null
      and not exists (
        select 1 from deck_cards dc
        where dc.deck_id = l.deck_id and dc.oracle_id = l.oracle_id
      )
  `);
}

/** Delete this deck's dormant locks: at a commit, the removals stayed, so their locks ended. */
export async function clearDormantLocks(tx: Runner, deckId: string): Promise<void> {
  await tx.execute(sql`delete from deck_locks where deck_id = ${deckId} and removed_at is not null`);
}

/**
 * Wake the dormant locks for these cards, so the insert that brings them back finds nothing for
 * the trigger to delete (D2). BEFORE the insert, and in its transaction: the trigger fires in the
 * insert's own statement, so a revive run after it would find no row left to wake.
 *
 * "Revive a dormant row if there is one", never "lock": the caller cannot assert a lock the server
 * does not hold. A discard passes every card its version holds (Hugh, 2026-09-25: a discard brings
 * a removed locked card back locked). Undo and Put back will pass the one card when Locked PR 5
 * wires them; until then they re-add through the trigger and the card returns unlocked.
 */
export async function reviveDormantLocks(tx: Runner, deckId: string, oracleIds: readonly string[]): Promise<void> {
  if (oracleIds.length === 0) return;
  await tx.execute(sql`
    update deck_locks
    set removed_at = null
    where deck_id = ${deckId}
      and removed_at is not null
      and oracle_id = any(${sql.param([...oracleIds])}::uuid[])
  `);
}
