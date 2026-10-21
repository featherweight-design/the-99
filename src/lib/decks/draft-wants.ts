import { sql } from "drizzle-orm";
import { db } from "../../db";

/** A committed deck whose draft has a card its newest version does not. */
export type DraftWant = { id: string; name: string };

/**
 * The decks that WANT a card only in their draft: a committed deck whose live list (its
 * `deck_cards`, or its live commander or partner) has the card while its newest version does not.
 *
 * WANTING IS NOT CLAIMING, and this read is deliberately separate from the claim model in
 * `availability-query.ts`. A claim says who holds a copy, so it reads what is sleeved (the newest
 * committed version) and a draft add has to stay out of it: counting one would take a card out of
 * a deck that has it in a box. But "which decks want this" has to name the draft add too, or a
 * card in the middle of a tune reads as wanted by nobody (Hugh, 2026-10-20). The claim rows answer
 * for every brew and every version; these rows are the remainder, so the two lists never name the
 * same deck for the same card.
 *
 * Excluded exactly as the claim model excludes them: a card the deck PRINTS (a proxy asks nothing
 * of the collection, and `proxiedBy` names those decks) and basic lands.
 *
 * Ordered by name, then id, the claims' own order. Null when the read FAILED, never `[]`, which
 * would say "no draft wants this".
 */
export async function loadDraftWants(userId: string, oracleId: string): Promise<DraftWant[] | null> {
  try {
    const rows = await db.execute<DraftWant>(sql`
      with newest_version as (
        select distinct on (v.deck_id)
          v.deck_id, v.id as version_id, v.commander_oracle_id, v.partner_oracle_id
        from deck_versions v
        join decks d on d.id = v.deck_id
        where d.user_id = ${userId}
        order by v.deck_id, v.number desc
      ),
      live as (
        select dc.deck_id
        from deck_cards dc
        join newest_version nv on nv.deck_id = dc.deck_id
        where dc.oracle_id = ${oracleId}
        union
        select d.id
        from decks d
        join newest_version nv on nv.deck_id = d.id
        where d.commander_oracle_id = ${oracleId} or d.partner_oracle_id = ${oracleId}
      )
      select d.id, d.name
      from live l
      join decks d on d.id = l.deck_id
      join newest_version nv on nv.deck_id = l.deck_id
      join cards c on c.oracle_id = ${oracleId}
      where c.type_line !~ '\\mBasic\\M'
        and nv.commander_oracle_id is distinct from ${oracleId}
        and nv.partner_oracle_id is distinct from ${oracleId}
        and not exists (
          select 1 from deck_version_cards vc
          where vc.version_id = nv.version_id and vc.oracle_id = ${oracleId}
        )
        and not exists (
          select 1 from deck_proxies p
          where p.deck_id = l.deck_id and p.oracle_id = ${oracleId}
        )
      order by d.name, d.id
    `);
    return rows.rows.map(({ id, name }) => ({ id, name }));
  } catch {
    return null;
  }
}
