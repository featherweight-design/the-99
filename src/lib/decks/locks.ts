import { sql } from "drizzle-orm";
import { db } from "../../db";
import { recordSoftFailure } from "../cache/soft-failure";

/**
 * Refusing a pull from a deck that has locked the card (L2: Pull it never takes from a deck where
 * the card is locked). Here rather than in `actions.ts` for the reason `PULL_REFUSED_PROXIED` is
 * in `proxies.ts`: a `"use server"` module may export functions only. New copy, for /copy-review.
 */
export const PULL_REFUSED_LOCKED = "That card is locked in that deck.";

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

/** `liveLockedIds` for several decks in ONE statement: each deck's live locked cards. */
export async function liveLockedIdsByDeck(tx: Runner, deckIds: readonly string[]): Promise<Map<string, ReadonlySet<string>>> {
  const out = new Map<string, Set<string>>(deckIds.map((id) => [id, new Set<string>()]));
  if (deckIds.length === 0) return out;
  const result = await tx.execute<{ deck_id: string; oracle_id: string }>(sql`
    select l.deck_id, l.oracle_id
    from deck_locks l
    where l.deck_id = any(${sql.param([...deckIds])}::uuid[])
      and l.removed_at is null
      and exists (
        select 1 from deck_cards dc
        where dc.deck_id = l.deck_id and dc.oracle_id = l.oracle_id
      )
  `);
  for (const r of result.rows) out.get(r.deck_id)?.add(r.oracle_id);
  return out;
}

/**
 * A predicate for a statement that deletes or decrements `deck_cards` rows: this row's card is NOT
 * locked in its deck. The sweeps put it inside their own write, after the deck row lock they
 * already take (T4), so a lock landing first is honoured and none can land between read and write.
 *
 * QUALIFIED BY HAND on both sides. Written the obvious way, the inner `oracle_id` resolves against
 * `deck_locks` itself and the predicate compares each lock row to itself: always true, every
 * locked card swept, no error (AGENTS.md, "A correlated subquery ... must alias and qualify").
 * `locks.test.ts` renders it and asserts the qualified form.
 */
export const notLiveLocked = () => sql`not exists (
  select 1 from deck_locks l
  where l.deck_id = "deck_cards"."deck_id"
    and l.oracle_id = "deck_cards"."oracle_id"
    and l.removed_at is null
)`;

/**
 * Is this one card locked in this deck right now? `liveLockedIds`'s rule for a single card, for a
 * caller about to cut or remove exactly it (a swap's cut, an undo's add). Same transaction, after
 * the deck row lock, and no swallowed failure.
 */
export async function isLiveLocked(tx: Runner, deckId: string, oracleId: string): Promise<boolean> {
  const { rows: [row] } = await tx.execute<{ locked: boolean }>(sql`
    select exists (
      select 1 from deck_locks l
      join deck_cards dc on dc.deck_id = l.deck_id and dc.oracle_id = l.oracle_id
      where l.deck_id = ${deckId} and l.oracle_id = ${oracleId} and l.removed_at is null
    ) as locked
  `);
  return row?.locked === true;
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
    recordSoftFailure();
    return new Set<string>();
  }
}

/**
 * Leave DORMANT every live lock whose card this deck no longer holds.
 *
 * Beside every `pruneOrphanProxies`, and a reconcile for the same reason that one is: several
 * callers replace the whole list, so "which lock has no membership NOW" is the only question that
 * is always right. Dormant rather than deleted, because the lock ends only if the removal STAYS
 * (L1): a discard, the review screen's Put back and the deck page's two Undos revive it, and a
 * commit deletes it
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
 * a removed locked card back locked). `addCardToDeck`'s `relock` passes the one card: the review
 * screen's Put back does, and so do the deck page's two Undos (the row's and the card view's).
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
