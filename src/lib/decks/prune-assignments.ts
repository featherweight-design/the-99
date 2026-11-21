import { and, eq, sql } from "drizzle-orm";
import { cardAssignments, pendingAssignments } from "../../db/schema";
import { lockCardClaims, type Tx } from "./assign";

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
  // A PENDING PICK LIVES AS LONG AS ITS CARD IS IN THE DRAFT (pending-picks.ts): every removal path ends in
  // this reconcile, so one statement covers them all, `removeOneCopy` included. A card added back is a new add.
  await tx.execute(sql`
    delete from pending_assignments p
    where p.deck_id = ${deckId}
      and not exists (
        select 1 from deck_cards dc where dc.deck_id = p.deck_id and dc.oracle_id = p.oracle_id
      )
  `);
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

/**
 * Several picks (Move a copy addendum G4, 2026-11-21): drop the picks a removal left beyond the copies that can be given.
 *
 * A card's picks (its reservations and its pending picks) never exceed its giveable copies when they are written
 * (`assignCopyIn`, `assignPendingIn`), but a collection change can lower the supply under them. The claim model already
 * grants reservations oldest first, so an excess pick holds nothing; it is deleted rather than left inert, because it
 * would hold its copy again the moment one arrived, and the cap counts it meanwhile. The NEWEST picks go, by
 * `(created_at, deck_id)`, the order the cap was filled in. `keep` is the removal chooser's own pick (the deck the player
 * just said keeps the card), which drops last: only when no copy is left to give at all.
 *
 * ONE GIVEABLE COPY is single-select, where a reservation and another deck's pending pick stand together by design
 * (`assignPendingIn`: the pending pick moves the reservation at its deck's commit). There each kind is capped on its own,
 * so a pick that is waiting for its commit never lapses because the copy it will take is reserved meanwhile.
 *
 * Only cards that have a pick are locked and read, so a replace that lowers thousands of cards costs one query when
 * almost none of them carry a pick. Takes each such card's claim lock, in sorted order, as every pick write does.
 */
export async function pruneExcessPicks(
  tx: Tx,
  userId: string,
  oracleIds: readonly string[],
  keep?: { oracleId: string; deckId: string },
): Promise<void> {
  const ids = [...new Set(oracleIds)];
  if (ids.length === 0) return;
  // Read before any lock: a pick written after this read is written under the cap the lowered supply sets.
  const { rows: withPicks } = await tx.execute<{ oracle_id: string }>(sql`
    select a.oracle_id from card_assignments a
    where a.user_id = ${userId} and a.oracle_id = any(${sql.param(ids)}::uuid[])
    union
    select p.oracle_id from pending_assignments p
    where p.user_id = ${userId} and p.oracle_id = any(${sql.param(ids)}::uuid[])
  `);
  for (const oracleId of withPicks.map((r) => r.oracle_id).sort()) {
    await lockCardClaims(tx, userId, oracleId);
    const keepDeck = keep?.oracleId === oracleId ? keep.deckId : null;
    const { rows } = await tx.execute<{ kind: "reserved" | "pending"; deck_id: string }>(sql`
      with giveable as (
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
        )::int as n
      ),
      picks as (
        select 'reserved' as kind, a.deck_id, a.copies, a.created_at
        from card_assignments a
        where a.user_id = ${userId} and a.oracle_id = ${oracleId}
        union all
        select 'pending' as kind, p.deck_id, p.copies, p.created_at
        from pending_assignments p
        where p.user_id = ${userId} and p.oracle_id = ${oracleId}
      ),
      ranked as (
        select p.kind, p.deck_id, g.n, sum(p.copies) over (
          partition by case when g.n = 1 then p.kind else 'all' end
          order by (p.deck_id::text = ${keepDeck}::text) is true desc, p.created_at, p.deck_id
          rows between unbounded preceding and current row
        ) as running
        from picks p cross join giveable g
      )
      select kind, deck_id from ranked where running > n
    `);
    for (const r of rows) {
      const table = r.kind === "reserved" ? cardAssignments : pendingAssignments;
      await tx.delete(table).where(and(eq(table.userId, userId), eq(table.oracleId, oracleId), eq(table.deckId, r.deck_id)));
    }
  }
}
