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
import { cardAssignments, deckCards, deckVersionCards, deckVersions, decks, pullReleases } from "../../db/schema";
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
 * returning the card to the seniority default; pressing a third deck moves the reservation rather
 * than adding to it.
 *
 * ONE AUTHORED RESERVATION PER CARD, WHATEVER THE SUPPLY — see the rule at the `taken >= 1`
 * branch below, which deletes before every insert so a second can never be written. An earlier
 * draft of this comment said a pick ADDS up to the cap when more than one copy is in play; that
 * was never what the code did, and a reader who believed it would write a preview for a state
 * this table cannot hold.
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
    // SERIALIZED PER CARD, before anything is read. The deck row lock below covers one deck, and
    // the supply question is about every deck at once: two picks naming DIFFERENT decks would
    // otherwise both read `taken < giveable` for a one-copy card and both insert, leaving the
    // model to grant one of them nothing while the row sits there counted as spent. The lock is
    // transaction-scoped, so a commit or a rollback releases it.
    //
    // Keyed on the PAIR as one bigint, not as two arguments: the two-argument form of
    // `pg_advisory_xact_lock` takes int4s, and `hashtextextended` returns a bigint, so the
    // two-key spelling does not resolve to any function at all — it fails the query rather than
    // taking a weaker lock, which is how the probe caught it. `hashtextextended` for the reason
    // `replaceCollection` uses it: the ids are text of arbitrary length.
    await lockCardClaims(tx, userId, oracleId);
    return assignCopyIn(tx, userId, oracleId, deckId, "toggle");
  });
}

/**
 * The per-card lock every reservation write takes before it reads anything: see `assignCopyFor`.
 * Transaction-scoped. A caller that also locks deck rows takes this FIRST, the order
 * `assignCopyFor` takes them in, or the two can deadlock.
 */
export async function lockCardClaims(tx: Tx, userId: string, oracleId: string): Promise<void> {
  await tx.execute(sql`
    select pg_advisory_xact_lock(hashtextextended(${userId} || ':' || ${oracleId}, 0))
  `);
}

/**
 * The reservation write itself, inside a transaction that already holds `lockCardClaims`.
 * `toggle` is a pick's press (the same deck again takes the copy back); `set` is a purchase's pick
 * from the cart, which only ever leaves the copy with `deckId`.
 */
export async function assignCopyIn(
  tx: Tx,
  userId: string,
  oracleId: string,
  deckId: string,
  mode: "toggle" | "set",
): Promise<AssignRefusal | null> {
  const ask = await reservableAsk(tx, userId, deckId, oracleId);
  if (typeof ask === "string") return ask;

  // Already reserved for this deck: a pick's press takes it back, and a purchase's pick (`set`)
  // leaves it standing. Nothing below applies — returning a copy can never be short of supply —
  // and a cleared row is indistinguishable from one that was never written.
  const [existing] = await tx.select({ deckId: cardAssignments.deckId })
    .from(cardAssignments)
    .where(and(
      eq(cardAssignments.userId, userId),
      eq(cardAssignments.oracleId, oracleId),
      eq(cardAssignments.deckId, deckId),
    ))
    .for("update");
  if (existing) {
    if (mode === "set") return null;
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

  // ONE AUTHORED RESERVATION PER CARD. A pick always MOVES rather than adding, whatever the
  // supply — which is the handoff's own accessibility model stated as a rule about the data:
  // "`aria-checked` is true for the brass option only", so one deck at a time carries the
  // player's authorship while seniority allocates the rest. Allowing two would put two checked
  // radios in one group, which tells assistive technology the wrong thing about a control that
  // is single-choice by design.
  //
  // The cap line is unaffected: it counts ALLOCATION — what every deck gets — and seniority
  // hands out the copies this pick does not.
  if (taken >= 1) {
    // The existing reservation gives way to the deck the player has just named. Oldest first,
    // because `(created_at, deck_id)` is the order the model resolves reservations in.
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
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** What a deck asks for: list copies (reservable) and commander copies (never reservable). */
interface Ask {
  listQuantity: number;
  commanderCopies: number;
}

/**
 * A committed deck's ask: its newest version's list, less any copy a pull released, bounded
 * exactly as the claim model bounds it (`all_claims`): never more than the version lists beyond
 * what the draft still holds. A deck whose only copy was pulled claims nothing, and reserving for
 * it would hand a copy to a deck that gave it up. Summed: a card pulled for two asking decks is
 * two rows.
 */
async function versionAsk(
  tx: Tx,
  deckId: string,
  oracleId: string,
  newest: { id: string; commanderOracleId: string; partnerOracleId: string | null },
): Promise<Ask> {
  const [listCard] = await tx.select({ quantity: deckVersionCards.quantity })
    .from(deckVersionCards)
    .where(and(
      eq(deckVersionCards.versionId, newest.id),
      eq(deckVersionCards.oracleId, oracleId),
    ));
  const [released] = await tx.select({
    copies: sql<number>`coalesce(sum(${pullReleases.copies}), 0)::int`,
    draft: sql<number>`coalesce((
      select sum(dc.quantity) from deck_cards dc
      where dc.deck_id = ${deckId} and dc.oracle_id = ${oracleId}
    ), 0)::int`,
  })
    .from(pullReleases)
    .where(and(eq(pullReleases.sourceDeckId, deckId), eq(pullReleases.oracleId, oracleId)));
  const versionQuantity = listCard?.quantity ?? 0;
  const releasedCopies = Math.min(released?.copies ?? 0, Math.max(versionQuantity - (released?.draft ?? 0), 0));
  return {
    listQuantity: versionQuantity - releasedCopies,
    commanderCopies:
      (newest.commanderOracleId === oracleId ? 1 : 0)
      + (newest.partnerOracleId === oracleId ? 1 : 0),
  };
}

/**
 * A brew's ask: its live list and its live commander columns, as `claim_decks_all` carries it. A
 * pull release never reduces a brew's claim (`all_claims` subtracts releases from a version only),
 * so none is read here either.
 */
async function brewAsk(
  tx: Tx,
  deckId: string,
  oracleId: string,
  deck: { commanderOracleId: string; partnerOracleId: string | null },
): Promise<Ask> {
  const [listCard] = await tx.select({
    quantity: sql<number>`coalesce(sum(${deckCards.quantity}), 0)::int`,
  })
    .from(deckCards)
    .where(and(eq(deckCards.deckId, deckId), eq(deckCards.oracleId, oracleId)));
  return {
    listQuantity: listCard?.quantity ?? 0,
    commanderCopies:
      (deck.commanderOracleId === oracleId ? 1 : 0)
      + (deck.partnerOracleId === oracleId ? 1 : 0),
  };
}

/**
 * Whether `deckId` can be given a copy of `oracleId` right now, read under that deck's row lock: the
 * guards a pick and a cart purchase share. Returns the deck's reservable LIST ask, or the named
 * refusal. Call inside the per-card advisory lock.
 */
async function reservableAsk(
  tx: Tx,
  userId: string,
  deckId: string,
  oracleId: string,
): Promise<AssignRefusal | { listQuantity: number }> {
  // The deck row first, and locked: every guard below reads what this deck currently claims,
  // and a commit landing between the read and the write would authorize against a version that
  // no longer exists. `commitVersion` takes this same lock first, so holding it is what makes
  // the two serialize.
  const [deck] = await tx.select().from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .for("update");
  if (!deck) return "not-your-deck";

  // WHAT THIS DECK ASKS FOR, read the way the claim model reads it. A committed deck asks for
  // what its NEWEST VERSION lists, never what its draft is toying with: reserving on a draft add
  // would let a draft-only ask displace a hard claimant, the precise thing seniority exists to
  // prevent. A BREW (no version at all) asks for its live list and its live commander columns,
  // which is exactly what `claim_decks_all` carries for it. Brews could not be given a copy
  // until 2026-10-11 (all-decks cart, Hugh's answer 2): when a purchase covers fewer decks than
  // want the card, the player chooses, brews included.
  //
  // THE VERSION'S OWN COMMANDER COLUMNS for a committed deck, not the deck's live ones: a deck
  // claims what it is SLEEVED as, so a commander changed in the draft since the last commit
  // does not move the claim.
  const [newest] = await tx.select({
    id: deckVersions.id,
    commanderOracleId: deckVersions.commanderOracleId,
    partnerOracleId: deckVersions.partnerOracleId,
  })
    .from(deckVersions)
    .where(eq(deckVersions.deckId, deckId))
    .orderBy(sql`${deckVersions.number} desc`)
    .limit(1);
  const { listQuantity, commanderCopies } = newest
    ? await versionAsk(tx, deckId, oracleId, newest)
    : await brewAsk(tx, deckId, oracleId, deck);
  // No claim at all — neither on the list nor as a commander.
  if (listQuantity + commanderCopies === 0) return "claimant-no-longer-asks";

  // A PROXY ENDS THE CLAIM TOO. The claim model anti-joins `deck_proxies`, so a deck printing
  // the card claims nothing — it is covered while owning nothing, which is the feature's whole
  // point. Reserving a copy for it would give a real copy to a deck that does not need one, and
  // the row would then be counted as spent against every deck that does.
  const { rows: [printed] } = await tx.execute<{ yes: boolean }>(sql`
    select exists (
      select 1 from deck_proxies p
      where p.deck_id = ${deckId} and p.oracle_id = ${oracleId}
    ) as yes
  `);
  if (printed?.yes) return "claimant-no-longer-asks";

  // A COMMANDER'S COPY CANNOT BE GIVEN AWAY — but a deck can hold the card as its commander AND
  // on its list, and that second copy is perfectly reservable. The test is therefore about the
  // LIST half of the ask, not about whether the deck's commander happens to be this card: an
  // earlier version refused the folded claim outright, which made the one state the design
  // draws as half-live (`keeps 1 · gets 1 more`) unreachable for the very deck it is about.
  if (listQuantity === 0) return "target-is-commander";
  return { listQuantity };
}

