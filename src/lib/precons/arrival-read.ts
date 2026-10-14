/**
 * What the arrival strip says on the one navigation after "Start a deck from this" (handoff S2):
 * the precon the deck was started from, how many cards it listed, and how many of its distinct
 * non-basic cards the reader owns, counted as the list and the open precon count them (any
 * printing, basic lands aside). Read only when `?from=precon` is on the URL, and only for the
 * reader's own deck.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { decks, precons } from "../../db/schema";

export type PreconArrival = { name: string; setCode: string; cards: number; unmapped: number; owned: number; of: number };

export async function readPreconArrival(userId: string, deckId: string): Promise<PreconArrival | null> {
  const [row] = await preconArrivalQuery(userId, deckId);
  return row ?? null;
}

/** The read itself, apart so a test can render its SQL (the correlated subqueries must qualify). */
export function preconArrivalQuery(userId: string, deckId: string) {
  return db
    .select({
      name: precons.name,
      setCode: precons.setCode,
      unmapped: precons.unmappedCount,
      cards: sql<number>`(select coalesce(sum(pc.quantity), 0) from precon_cards pc where pc.file_name = ${precons}.file_name)::int`,
      of: sql<number>`(
        select count(distinct pc.oracle_id) from precon_cards pc
        join cards c on c.oracle_id = pc.oracle_id
        where pc.file_name = ${precons}.file_name and c.type_line not like 'Basic%'
      )::int`,
      owned: sql<number>`(
        select count(distinct pc.oracle_id) from precon_cards pc
        join cards c on c.oracle_id = pc.oracle_id
        where pc.file_name = ${precons}.file_name and c.type_line not like 'Basic%'
          and exists (select 1 from collection_items ci where ci.user_id = ${userId} and ci.oracle_id = pc.oracle_id)
      )::int`,
    })
    .from(decks)
    .innerJoin(precons, eq(precons.fileName, decks.builtFromPrecon))
    // Until the deck is committed AFTER its start: the URL keeps `?from=precon`, so a deck the player has since
    // committed must not read as just started on a reload. A start commits the deck's first version in the same
    // transaction that makes the deck, so only a version committed noticeably later counts as the player's own.
    .where(and(
      eq(decks.id, deckId),
      eq(decks.userId, userId),
      sql`not exists (
        select 1 from deck_versions dv
        where dv.deck_id = ${decks}.id and dv.committed_at > ${decks}.created_at + interval '1 minute'
      )`,
    ));
}
