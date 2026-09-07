import { eq } from "drizzle-orm";
import { db } from "../../db";
import { commanderSupport } from "../../db/schema";

/**
 * The accepted sentence for one commander, or null.
 *
 * Null covers both "no row in the index" and "a row whose prose was never accepted".
 * The design draws one state for both, because a reader cannot act on the difference:
 * either way there is no paragraph and the surrounding sections carry the page.
 */
export async function readCommanderProse(oracleId: string): Promise<string | null> {
  const [row] = await db.select({ prose: commanderSupport.prose })
    .from(commanderSupport)
    .where(eq(commanderSupport.commanderOracleId, oracleId))
    .limit(1);
  return row?.prose ?? null;
}

