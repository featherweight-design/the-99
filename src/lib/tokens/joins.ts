import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardTokens, deckTokenJoins, tokenOwnership } from "../../db/schema";
import { deckMakerIds } from "./read";
import { markTokenOwned, syncPreconTokens, unmarkTokenOwned } from "./ownership";

export type TokenWrite = "done" | "notThisDeck";

/** Whether this player's deck holds a card that makes this token. A deck that is not theirs holds none. */
async function deckMakesToken(deckId: string, userId: string, tokenOracleId: string): Promise<boolean> {
  const makerIds = await deckMakerIds(deckId, userId);
  if (!makerIds || makerIds.length === 0) return false;
  const [hit] = await db.select({ id: cardTokens.tokenOracleId }).from(cardTokens)
    .where(and(eq(cardTokens.tokenOracleId, tokenOracleId), inArray(cardTokens.cardOracleId, makerIds)))
    .limit(1);
  return !!hit;
}

/** Puts one of this deck's tokens on its Shopping list. A token the deck does not make is refused. */
export async function joinToken(userId: string, deckId: string, tokenOracleId: string): Promise<TokenWrite> {
  if (!(await deckMakesToken(deckId, userId, tokenOracleId))) return "notThisDeck";
  // Under the player's lock, with the ownership read inside it: a held token is never joined (the readers hide
  // such a join, and an unmark would bring it back), and the mark and the upload take the same lock, so a stale
  // or racing Add cannot slip a join in beside them.
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    const [held] = await tx.select({ id: tokenOwnership.tokenOracleId }).from(tokenOwnership)
      .where(and(eq(tokenOwnership.userId, userId), eq(tokenOwnership.tokenOracleId, tokenOracleId)))
      .limit(1);
    if (held) return;
    await tx.insert(deckTokenJoins).values({ deckId, tokenOracleId, userId }).onConflictDoNothing();
  });
  return "done";
}

/** Takes a token off this deck's Shopping list. Scoped by user as well as deck; a missing row is not an error. */
export async function leaveToken(userId: string, deckId: string, tokenOracleId: string): Promise<void> {
  await db.delete(deckTokenJoins).where(and(
    eq(deckTokenJoins.deckId, deckId), eq(deckTokenJoins.tokenOracleId, tokenOracleId), eq(deckTokenJoins.userId, userId),
  ));
}

/**
 * `I have one`, and the Shopping row's buy press: records the token as held by hand and takes it off EVERY
 * deck's Shopping list in the same save. Owned means owned for every deck (plan lock 8), and an unmark later
 * restores no join. The deck that pressed must make the token: a mark on a token no card makes could not be
 * unmarked from anywhere (the unmark holds the same rule), so a joined orphan offers only its remove press.
 */
export async function markOwnedOnDeck(userId: string, deckId: string, tokenOracleId: string): Promise<TokenWrite> {
  if (!(await deckMakesToken(deckId, userId, tokenOracleId))) return "notThisDeck";
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    // Joins first, then the ownership row: the upload takes them in this order too (`writeUploadTokens`), so
    // an upload and a press that meet on one token cannot each hold what the other waits for.
    await tx.delete(deckTokenJoins).where(and(
      eq(deckTokenJoins.tokenOracleId, tokenOracleId), eq(deckTokenJoins.userId, userId),
    ));
    await markTokenOwned(userId, tokenOracleId, tx);
  });
  return "done";
}

/**
 * Unmarks a HAND mark; an upload row is left standing. Held to the same rule as every other write
 * here: the token must be one this deck makes, because the unmark itself is account-wide.
 */
export async function unmarkOwned(userId: string, deckId: string, tokenOracleId: string): Promise<TokenWrite> {
  if (!(await deckMakesToken(deckId, userId, tokenOracleId))) return "notThisDeck";
  // A join made before the account-wide rule (while the token was held) is still in the table, hidden by the
  // readers: clear it with the mark, in the mark's own order, so an unmark never brings a token back onto a list.
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
    await tx.delete(deckTokenJoins).where(and(
      eq(deckTokenJoins.tokenOracleId, tokenOracleId), eq(deckTokenJoins.userId, userId),
    ));
    await unmarkTokenOwned(userId, tokenOracleId, tx);
    // A precon added to the collection that holds this token claims it again: its cards still stand.
    await syncPreconTokens(tx, userId);
  });
  return "done";
}
