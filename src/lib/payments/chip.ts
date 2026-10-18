import { eq } from "drizzle-orm";
import { db } from "../../db";
import { creditGrants } from "../../db/schema";
import { readAllowance } from "../model/allowance";
import { isPaidSource } from "../model/credit-rule";
import { chipFor, type ChipState } from "./chip-rule";
import { paymentsEnabled } from "./flag";

/**
 * The menu chip's read (plan E10): per request, outside every cached page payload. The shell reads it on render and
 * the menu re-reads it through `chipAction` each time it opens (a Checkout return reloads the page, so the shell reads
 * it again then), so a layout that does not re-render on navigation never shows a stale count when the menu is open. `env` is the request's resolved switches, never `process.env`.
 *
 * A reader the switch turns away and who never bought costs ONE indexed lookup: the allowance (four reads) is only
 * read for a reader who may see the chip. Anything that throws answers `null`: the chip is a convenience, never an error.
 */
export async function readChip(userId: string, env: NodeJS.ProcessEnv, now: Date = new Date()): Promise<ChipState | null> {
  try {
    const switchOn = paymentsEnabled(env);
    // A welcome lot or an admin's gift was never bought, so neither makes a reader "someone who has bought"
    // (`isPaidSource`); each is still a lot the allowance read below must see, so a reader holding only one reaches
    // `chipFor`, which turns them away when nothing is held.
    const sources = await db.select({ source: creditGrants.source }).from(creditGrants).where(eq(creditGrants.userId, userId)).groupBy(creditGrants.source);
    const everBought = sources.some((r) => isPaidSource(r.source));
    if (!switchOn && sources.length === 0) return null;
    return chipFor({ allowance: await readAllowance(userId, now), switchOn, everBought }, now);
  } catch {
    return null;
  }
}
