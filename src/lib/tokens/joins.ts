import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cardTokens, deckTokenJoins } from "../../db/schema";
import { deckMakerIds } from "./read";
import { markTokenOwned, unmarkTokenOwned } from "./ownership";

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
  await db.insert(deckTokenJoins).values({ deckId, tokenOracleId, userId }).onConflictDoNothing();
  return "done";
}

/** Takes a token off this deck's Shopping list. Scoped by user as well as deck; a missing row is not an error. */
export async function leaveToken(userId: string, deckId: string, tokenOracleId: string): Promise<void> {
  await db.delete(deckTokenJoins).where(and(
    eq(deckTokenJoins.deckId, deckId), eq(deckTokenJoins.tokenOracleId, tokenOracleId), eq(deckTokenJoins.userId, userId),
  ));
}

/**
 * `I have one`: records the token as held by hand and takes it off THIS deck's Shopping list in the same
 * save (X4m). Other decks' joins stay: the readers leave a held token off Shopping everywhere (S4), so
 * unmarking it later puts it back where the player had asked for it.
 */
export async function markOwnedOnDeck(userId: string, deckId: string, tokenOracleId: string): Promise<TokenWrite> {
  if (!(await deckMakesToken(deckId, userId, tokenOracleId))) return "notThisDeck";
  await db.transaction(async (tx) => {
    await markTokenOwned(userId, tokenOracleId, tx);
    await tx.delete(deckTokenJoins).where(and(
      eq(deckTokenJoins.deckId, deckId), eq(deckTokenJoins.tokenOracleId, tokenOracleId), eq(deckTokenJoins.userId, userId),
    ));
  });
  return "done";
}

/**
 * Unmarks a HAND mark; an upload row is left standing. Held to the same rule as every other write
 * here: the token must be one this deck makes, because the unmark itself is account-wide.
 */
export async function unmarkOwned(userId: string, deckId: string, tokenOracleId: string): Promise<TokenWrite> {
  if (!(await deckMakesToken(deckId, userId, tokenOracleId))) return "notThisDeck";
  await unmarkTokenOwned(userId, tokenOracleId);
  return "done";
}
