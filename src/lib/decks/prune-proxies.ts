import { sql } from "drizzle-orm";
import type { db } from "../../db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Anything that can run one statement: a transaction, or the db singleton.
 * Structural rather than `Tx`, because every caller in `src/` passes a
 * transaction and the probe passes the singleton — the statement is a single
 * DELETE either way, so there is nothing a transaction gives it that it needs.
 */
type Runner = Pick<Tx, "execute">;

/**
 * Delete this deck's proxy rows for cards it no longer holds.
 *
 * A proxy is one deck's statement about one slot, so it dies with the slot. The
 * reads are membership-scoped as well, which makes an orphan row inert for as
 * long as it exists — but inert is not gone, and **a card re-added later would
 * match the anti-join again and arrive silently already proxied**. That is the
 * failure this closes, and the reads' scoping is defence in depth behind it
 * rather than the guarantee itself.
 *
 * ONE RECONCILE STATEMENT, NOT A LIST OF WHAT LEFT. Every caller has just
 * removed or replaced some part of the deck's list, and several of them (a
 * re-import, a discard back to a version) delete every row and write a new set.
 * Passing "the cards that went" would be wrong for those — the cards that came
 * back are in the new set — so this asks the only question that is always right:
 * which proxy rows have no membership NOW. Both commander columns count as
 * membership, or proxying a commander would be undone by the next edit to the
 * list below it.
 *
 * Idempotent, and safe to call when nothing was removed. `prune-proxies.test.ts`
 * fails when a `delete(deckCards)` appears without one of these beside it.
 *
 * THIS STATEMENT ALONE DOES NOT CLOSE THE RACE, and the other half is the
 * writer's. A proxy write that validated membership, then inserted, could have
 * its insert land after a concurrent removal's prune has already run — leaving
 * exactly the orphan this exists to prevent, on a card that is no longer in the
 * deck. So `setCardProxied` takes the deck row's lock first:
 *
 *   select 1 from decks where id = $1 for update
 *
 * which is the lock `removeCardFromDeck` and `clearAutoCards` already take
 * before they touch a list, so the two serialise on the same row and the
 * validate-insert pair cannot straddle a prune.
 *
 * A DECK'S PRINTING PICKS GO WITH IT. `deck_printings` is the same kind of row (one deck's
 * statement about one slot, outside versioning) and has the same failure: a card re-added later
 * would arrive silently already picked. Pruned here rather than beside every caller, so the guard
 * test that holds every `delete(deckCards)` to a prune holds the picks to it too. `setDeckPrinting`
 * takes the same deck row lock as `setCardProxied`.
 */
export async function pruneOrphanProxies(tx: Runner, deckId: string): Promise<void> {
  await tx.execute(sql`
    delete from deck_proxies p
    where p.deck_id = ${deckId}
      and not exists (
        select 1 from deck_cards dc
        where dc.deck_id = p.deck_id and dc.oracle_id = p.oracle_id
      )
      and not exists (
        select 1 from decks d
        where d.id = p.deck_id
          and (d.commander_oracle_id = p.oracle_id or d.partner_oracle_id = p.oracle_id)
      )
  `);
  await tx.execute(sql`
    delete from deck_printings dp
    where dp.deck_id = ${deckId}
      and not exists (
        select 1 from deck_cards dc
        where dc.deck_id = dp.deck_id and dc.oracle_id = dp.oracle_id
      )
      and not exists (
        select 1 from decks d
        where d.id = dp.deck_id
          and (d.commander_oracle_id = dp.oracle_id or d.partner_oracle_id = dp.oracle_id)
      )
  `);
}
