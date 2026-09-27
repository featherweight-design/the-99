import { sql } from "drizzle-orm";
import { db } from "../../db";
import { recordSoftFailure } from "../cache/soft-failure";

/**
 * The refusal a failed proxy read produces on the pull path.
 *
 * Here rather than in `actions.ts` because that module is `"use server"`, where
 * a non-function export makes the whole file export NOTHING — the build fails
 * with every action in it reported missing, several files away from the cause.
 *
 * Named at all so a test can tell this refusal from every other one: a fail-open
 * bug refuses for a different reason, or not at all, and an assertion on
 * `ok === false` alone would pass over both.
 */
export const PROXY_READ_FAILED = "Could not check that deck just now. Try again.";

/**
 * Refusing a pull for a card the asking deck prints.
 *
 * Its own sentence because the generic refusal — "that deck already has the
 * copies it needs" — is a claim about the collection, and a printed card means
 * the deck is covered while owning nothing. Saying it the generic way would put
 * the app on the wrong side of the one distinction this feature exists to keep.
 */
export const PULL_REFUSED_PROXIED = "That deck is running a proxy for this card.";

/**
 * Is this card in this deck right now? A `deck_cards` row, or either commander
 * column.
 *
 * ONE definition, exported, because it had two: the action carried this
 * predicate and `probe-proxies` carried a copy of it, so a regression dropping
 * either commander arm left both proofs green while proxying a commander broke
 * in production. A probe that reimplements the thing it is proving proves the
 * copy.
 *
 * `proxies-sql.test.ts` renders it and asserts both commander columns are in
 * the emitted SQL, which is the `.toSQL()` idiom this repository already uses
 * for query shape.
 */
export const proxiedMembership = (deckId: string, oracleId: string) => sql`exists (
  select 1 from deck_cards dc
  where dc.deck_id = ${deckId} and dc.oracle_id = ${oracleId}
  union all
  select 1 from decks d
  where d.id = ${deckId}
    and (d.commander_oracle_id = ${oracleId} or d.partner_oracle_id = ${oracleId})
)`;

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
  /**
   * What a failed read means. `"empty"` degrades to "no proxies", which is how
   * every rendering surface read before the feature existed — a missing mark is
   * the right cost for a query that did not run.
   *
   * `"throw"` is for a caller AUTHORIZING something destructive. `pullCardFromDeck`
   * takes a copy out of another deck, and it decides that partly on this answer:
   * a printed add asks the collection for nothing, so no pull is warranted. If
   * the read fails and we say "no proxies", the pull is authorized on a card the
   * asking deck was never short of, and another deck loses a copy. Fail closed.
   */
  onError: "empty" | "throw" = "empty",
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
  } catch (err) {
    if (onError === "throw") throw err;
    recordSoftFailure();
    return new Set<string>();
  }
}

/**
 * What one deck prints, in two figures that must not be conflated.
 *
 * `copies` — how many CARDS this deck prints, commander included. One mark is
 *   one proxy however many copies of the card the deck holds (ruling 5: a proxy
 *   has no quantity). This is the tile's `N proxies` line.
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
        -- ONE MARK IS ONE PROXY. Ruling 5: a proxy covers the deck's whole ask
        -- for a card and has no quantity, so a single mark on a row holding four
        -- copies is one printed card, not four. Summing quantities here made a
        -- deck with one marked playset read 4 proxies.
        --
        -- A card that is both this deck's commander and a row on its own list is
        -- still one mark — the primary key says so — so nothing has to fold.
        count(*)::int as copies,
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
    recordSoftFailure();
    return new Map<string, ProxyCount>();
  }
}
