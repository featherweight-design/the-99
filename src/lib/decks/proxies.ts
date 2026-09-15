import { sql } from "drizzle-orm";
import { db } from "../../db";

/**
 * The oracle ids this deck prints, as a set.
 *
 * Scoped to current membership — a `deck_cards` row or either commander column —
 * for the reason every proxy read is: a row whose card has left the deck must
 * name nothing. `pruneOrphanProxies` means one should not exist, and this is the
 * reading half of that pair.
 *
 * Swallowed to an empty set, like the claim read this sits beside: a failed
 * proxy read leaves the draft reading exactly as it did before proxies existed.
 */
export async function proxiedOracleIds(
  deckId: string,
  userId: string,
): Promise<ReadonlySet<string>> {
  // try/catch around the call and not only `.catch` on the promise: a throw
  // here can be synchronous — a db stub with no `execute` at all is the usual
  // one — and a rejected-promise handler never sees that. Either way the answer
  // is the same: no proxies, which is how every one of these surfaces read
  // before the feature existed.
  try {
    const result = await db.execute<{ oracle_id: string }>(sql`
      select p.oracle_id
      from deck_proxies p
      join decks d on d.id = p.deck_id
      where p.deck_id = ${deckId}
        and d.user_id = ${userId}
        and (
          exists (
            select 1 from deck_cards dc
            where dc.deck_id = p.deck_id and dc.oracle_id = p.oracle_id
          )
          or d.commander_oracle_id = p.oracle_id
          or d.partner_oracle_id = p.oracle_id
        )
    `);
    return new Set(result.rows.map((x) => x.oracle_id));
  } catch {
    return new Set<string>();
  }
}
