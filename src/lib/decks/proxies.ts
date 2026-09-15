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

/**
 * What one deck prints, in two figures that must not be conflated.
 *
 * `copies` — every printed copy, commander included. This is the tile's
 *   `N proxies` line, which counts a printed commander with everything else.
 *
 * `covers` — printed copies of BODY rows the player does not own. The only
 *   figure that may be added to `ownedCount`, and the reason the two are
 *   separate: a proxied commander is not a body slot, and a proxied card the
 *   player also owns is already inside `ownedCount`. Adding one total to
 *   `ownedCount` let a proxied commander fill an unowned body slot, so a
 *   98-owned 99-card deck read `Complete` with a card genuinely missing.
 */
export type ProxyCount = { copies: number; covers: number };

export async function proxyCounts(userId: string): Promise<Map<string, ProxyCount>> {
  // try/catch around the call, not only `.catch` on the promise, for the reason
  // `proxiedOracleIds` states: a synchronous throw never reaches a rejection
  // handler, and the answer either way is "no proxies", which is how every one
  // of these surfaces read before the feature existed.
  try {
    const result = await db.execute<{ deck_id: string; copies: number; covers: number }>(sql`
      select
        p.deck_id,
        sum(case when dc.oracle_id is not null then dc.quantity else 1 end)::int as copies,
        sum(
          case
            when dc.oracle_id is not null and not exists (
              select 1 from collection_items ci
              where ci.user_id = ${userId} and ci.oracle_id = p.oracle_id
            ) then dc.quantity
            else 0
          end
        )::int as covers
      from deck_proxies p
      join decks d on d.id = p.deck_id
      left join deck_cards dc
        on dc.deck_id = p.deck_id and dc.oracle_id = p.oracle_id
      where d.user_id = ${userId}
        and (
          dc.oracle_id is not null
          or d.commander_oracle_id = p.oracle_id
          or d.partner_oracle_id = p.oracle_id
        )
      group by p.deck_id
    `);
    return new Map(result.rows.map((r) => [r.deck_id, { copies: r.copies, covers: r.covers }]));
  } catch {
    return new Map<string, ProxyCount>();
  }
}
