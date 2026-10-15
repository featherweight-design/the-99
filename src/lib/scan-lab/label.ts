import { and, eq, exists } from "drizzle-orm";
import { db } from "../../db";
import { cards, scanLabResults } from "../../db/schema";

/**
 * Names the card a ✗ tap really showed: the player's pick from "What card was it?" goes onto that
 * tap's row as `true_oracle_id`. Only the player's own row, only a ✗ row (a ✓ row's guess is the
 * card), and only a card the catalog holds. A later pick replaces an earlier one. Returns whether a
 * row took it.
 */
export async function labelResult(userId: string, resultId: string, oracleId: string): Promise<boolean> {
  const rows = await labelQuery(userId, resultId, oracleId);
  return rows.length === 1;
}

/** The write itself, apart so its guards can be read off the emitted SQL. */
export function labelQuery(userId: string, resultId: string, oracleId: string) {
  return db
    .update(scanLabResults)
    .set({ trueOracleId: oracleId })
    .where(and(
      eq(scanLabResults.id, resultId),
      eq(scanLabResults.userId, userId),
      eq(scanLabResults.correct, false),
      exists(db.select({ one: cards.oracleId }).from(cards).where(eq(cards.oracleId, oracleId))),
    ))
    .returning({ id: scanLabResults.id });
}
