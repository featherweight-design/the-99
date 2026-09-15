/**
 * Giving a contested copy to a deck — the guarded write itself.
 *
 * NOT IN `assignment-actions.ts`, and that is a security boundary rather than tidiness: that
 * module is marked `"use server"`, so every export of it is a server action reachable by any
 * caller, and this function takes a `userId`. Exported from there it would let anybody who knew
 * an id write reservations against somebody else's decks. The action authenticates and calls
 * this; `pnpm probe:claims` calls it directly, because a probe has no request to authenticate.
 *
 * Every caller is responsible for having established whose collection this is. Nothing here
 * checks — except that the DECK belongs to the id it was given, which is a different question
 * and is checked under the lock below.
 *
 * THE WRITE AUTHORIZES ITSELF. The summary's rows come out of a payload written at import time,
 * so by the time a player presses one the world may have moved: a deck can have committed a
 * removal, promoted the card to its commander, or had the last spare taken by another pick.
 * Every one of those is re-read inside this transaction, under the same locks as the write, and
 * refused BY NAME so the row can say which happened.
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardAssignments, deckVersionCards, deckVersions, decks } from "../../db/schema";
import { isUuid } from "../uuid";

/**
 * Why a pick did not take.
 *
 * Three of the four are DRAWN, each with its own sentence and its own redraw. `not-your-deck` is
 * deliberately undrawn: a player cannot reach it from their own decks, so a state for it would be
 * drawing an attack.
 */
export type AssignRefusal =
  | "claimant-no-longer-asks"
  | "no-supply-left"
  | "target-is-commander"
  | "not-your-deck";

/**
 * Give one copy of `oracleId` to `deckId`, or take back the copy already given to it.
 *
 * ONE TOGGLE, THREE OUTCOMES, distinguishable only by what is already stored: pressing a deck
 * with no reservation writes one; pressing the deck you already reserved for deletes it,
 * returning the card to the seniority default; pressing a third deck when the cap is spent moves
 * the reservation rather than adding to it. With more than one copy in play a pick ADDS up to the
 * cap, because two copies really can go to two decks.
 *
 * Returns null when the write landed, or the named cause when it did not.
 */
export async function assignCopyFor(
  userId: string,
  oracleId: string,
  deckId: string,
): Promise<AssignRefusal | null> {
  if (!isUuid(oracleId) || !isUuid(deckId)) return "not-your-deck";
  return db.transaction<AssignRefusal | null>(async (tx) => {
    // The deck row first, and locked: every guard below reads what this deck currently claims,
    // and a commit landing between the read and the write would authorize against a version that
    // no longer exists. `commitVersion` takes this same lock first, so holding it is what makes
    // the two serialize.
    const [deck] = await tx.select().from(decks)
      .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
      .for("update");
    if (!deck) return "not-your-deck";

    // A commander's copy cannot be given away. It is checked before the claim below because it
    // is the more specific answer: a player told instead that the deck is not asking for the card
    // would go looking for a problem with a list that is perfectly correct.
    if (deck.commanderOracleId === oracleId || deck.partnerOracleId === oracleId) {
      return "target-is-commander";
    }

    // A CURRENT HARD CLAIM, not merely a committed deck. A deck can hold the card as a draft add
    // its version does not contain, and reserving on that basis would let a draft-only ask
    // displace a hard claimant — the precise thing seniority exists to prevent.
    const [newest] = await tx.select({ id: deckVersions.id })
      .from(deckVersions)
      .where(eq(deckVersions.deckId, deckId))
      .orderBy(sql`${deckVersions.number} desc`)
      .limit(1);
    if (!newest) return "claimant-no-longer-asks";
    const [claim] = await tx.select({ quantity: deckVersionCards.quantity })
      .from(deckVersionCards)
      .where(and(
        eq(deckVersionCards.versionId, newest.id),
        eq(deckVersionCards.oracleId, oracleId),
      ));
    if (!claim) return "claimant-no-longer-asks";

    // Already reserved for this deck: the press takes it back. Nothing below applies — returning
    // a copy can never be short of supply — and a cleared row is indistinguishable from one that
    // was never written.
    const [existing] = await tx.select({ deckId: cardAssignments.deckId })
      .from(cardAssignments)
      .where(and(
        eq(cardAssignments.userId, userId),
        eq(cardAssignments.oracleId, oracleId),
        eq(cardAssignments.deckId, deckId),
      ))
      .for("update");
    if (existing) {
      await tx.delete(cardAssignments).where(and(
        eq(cardAssignments.userId, userId),
        eq(cardAssignments.oracleId, oracleId),
        eq(cardAssignments.deckId, deckId),
      ));
      return null;
    }

    // WHAT IS LEFT TO GIVE, read under the lock. The ceiling is the supply less every copy held
    // as somebody's commander — those are never reservable — and what is left of it is that less
    // the reservations already made. A row the player pressed may have been drawn before another
    // pick took the last copy.
    const { rows: [supply] } = await tx.execute<{ giveable: number; taken: number }>(sql`
      with owned as (
        select coalesce(sum(ci.quantity), 0)::int as n
        from collection_items ci
        where ci.user_id = ${userId} and ci.oracle_id = ${oracleId}
      ),
      newest_version as (
        select distinct on (v.deck_id) v.deck_id, v.id, v.commander_oracle_id, v.partner_oracle_id
        from deck_versions v
        join decks d on d.id = v.deck_id
        where d.user_id = ${userId}
        order by v.deck_id, v.number desc
      ),
      commanders as (
        select count(*)::int as n
        from newest_version nv
        where nv.commander_oracle_id = ${oracleId} or nv.partner_oracle_id = ${oracleId}
      ),
      reserved as (
        select coalesce(sum(a.copies), 0)::int as n
        from card_assignments a
        where a.user_id = ${userId} and a.oracle_id = ${oracleId}
      )
      select
        greatest((select n from owned) - (select n from commanders), 0)::int as giveable,
        (select n from reserved)::int as taken
    `);
    const giveable = supply?.giveable ?? 0;
    const taken = supply?.taken ?? 0;

    if (giveable <= 0) return "no-supply-left";

    if (taken >= giveable) {
      // The cap is spent, so this is a MOVE rather than an addition: the oldest reservation gives
      // way to the deck the player has just named. Oldest, because `(created_at, deck_id)` is the
      // order the model resolves reservations in, so releasing the oldest is the one release that
      // frees the copy this deck will then take.
      const [oldest] = await tx.select({ deckId: cardAssignments.deckId })
        .from(cardAssignments)
        .where(and(
          eq(cardAssignments.userId, userId),
          eq(cardAssignments.oracleId, oracleId),
        ))
        .orderBy(cardAssignments.createdAt, cardAssignments.deckId)
        .limit(1)
        .for("update");
      // Nothing to move and nothing spare: the copies are all held by claims no pick can touch.
      if (!oldest) return "no-supply-left";
      await tx.delete(cardAssignments).where(and(
        eq(cardAssignments.userId, userId),
        eq(cardAssignments.oracleId, oracleId),
        inArray(cardAssignments.deckId, [oldest.deckId]),
      ));
    }

    await tx.insert(cardAssignments).values({ userId, oracleId, deckId });
    return null;
  });

}
