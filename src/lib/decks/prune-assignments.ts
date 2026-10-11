import { sql } from "drizzle-orm";
import type { db } from "../../db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Anything that can run one statement — a transaction, or the db singleton. Same shape, and for
 * the same reason, as `prune-proxies`: the statement is a single DELETE either way. */
type Runner = Pick<Tx, "execute">;

/**
 * Delete this deck's reservations for cards it no longer CLAIMS.
 *
 * A reservation is a decision about a contested claim, so it dies with the claim. Two things end
 * one, and both have to be swept by the same statement because both are "this deck no longer
 * claims that card":
 *
 *   A COMMIT that produces a version without the card. The reservation was made about a list
 *   the deck has since changed. For a BREW, which claims off its live list, the list edit itself
 *   (every `delete(deckCards)` reaches here through `pruneOrphanProxies`).
 *   A PROXY. The claim model anti-joins deck_proxies, so a proxied card is not claimed at all —
 *   the deck is covered while owning nothing, which is the whole point of the feature.
 *
 * ONE RECONCILE STATEMENT, NOT A LIST OF WHAT LEFT, exactly as pruneOrphanProxies is written
 * and for the same reason: several callers replace a deck's whole list, so "the cards that went"
 * is the wrong question for them. This asks the only question that is always right — which
 * reservations have no claim NOW.
 *
 * INERT IS NOT GONE, which is why this exists at all. A reservation for an unclaimed card already
 * grants nothing: the claim model caps a grant at the deck's own committed ask, and an unclaimed
 * card has none. But a row left behind matches again the moment the card comes back — a deck that
 * unproxies, or re-adds and re-commits, would arrive silently already holding somebody's contested
 * copy, and assignCopyFor's own supply count would meanwhile treat that row as spent.
 *
 * Takes the deck's row lock from its caller, as the proxy prune does. Every call site here is
 * already inside a transaction holding it.
 */
export async function pruneOrphanAssignments(tx: Runner, deckId: string): Promise<void> {
  await tx.execute(sql`
    delete from card_assignments a
    where a.deck_id = ${deckId}
      and (
        -- No claim on this card. A COMMITTED deck claims what its newest version lists;
        -- distinct-on rather than a max(), because the newest version is identified by its number
        -- and this has to agree with the claim model's own choice. A BREW (no version) claims its
        -- live list, and since 2026-10-11 may hold a reservation against it (all-decks cart).
        -- Commander copies are never reservable, so the commander columns are no claim here.
        (
          exists (select 1 from deck_versions v where v.deck_id = a.deck_id)
          and not exists (
            select 1
            from (
              select distinct on (v.deck_id) v.id
              from deck_versions v
              where v.deck_id = a.deck_id
              order by v.deck_id, v.number desc
            ) nv
            join deck_version_cards vc on vc.version_id = nv.id
            where vc.oracle_id = a.oracle_id
          )
        )
        or (
          not exists (select 1 from deck_versions v where v.deck_id = a.deck_id)
          and not exists (
            select 1 from deck_cards dc
            where dc.deck_id = a.deck_id and dc.oracle_id = a.oracle_id
          )
        )
        -- …or the deck prints it, which removes the claim just as surely.
        or exists (
          select 1 from deck_proxies p
          where p.deck_id = a.deck_id and p.oracle_id = a.oracle_id
        )
      )
  `);
}
