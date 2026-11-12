import { eq } from "drizzle-orm";
import { db } from "../../db";
import { creditGrants } from "../../db/schema";
import { readAllowance } from "../model/allowance";
import { isPaidSource } from "../model/credit-rule";
import { chipFor, type ChipState } from "./chip-rule";
import { paymentsEnabled } from "./flag";
import { planCardFacts } from "./plan-card-rule";
import { readPlanFacts } from "./plan-read";

/** The sources of the reader's lots, one row each: one indexed lookup (`credit_grants_user_idx`). */
export function readLotSources(userId: string) {
  return db.select({ source: creditGrants.source }).from(creditGrants).where(eq(creditGrants.userId, userId)).groupBy(creditGrants.source);
}

/**
 * "Has bought": a lot of a source the player buys (`isPaidSource`). A welcome lot or an admin's gift was never bought,
 * so neither counts. The ONE rule the chip and the welcome teaser share (welcome credits audit, `everBought`).
 */
export function boughtFrom(sources: readonly { source: string }[]): boolean {
  return sources.some((r) => isPaidSource(r.source));
}

/** Whether the reader has ever bought credits, by `boughtFrom`. */
export async function readEverBought(userId: string): Promise<boolean> {
  return boughtFrom(await readLotSources(userId));
}

/**
 * The menu chip's read (plan E10): per request, outside every cached page payload. The shell reads it on render and
 * the menu re-reads it through `chipAction` each time it opens (a Checkout return reloads the page, so the shell reads
 * it again then), so a layout that does not re-render on navigation never shows a stale count when the menu is open. `env` is the request's resolved switches, never `process.env`.
 *
 * A reader the switch turns away and who never bought costs TWO indexed lookups (their lots' sources and their
 * subscription row, run together): the allowance (four reads) is only read for a reader who may see the chip. A live plan
 * (`planHeld`, the page's own rule) keeps the chip even before its first invoice has granted a credit. Anything that throws answers `null`: the chip is a convenience, never an error.
 */
export async function readChip(userId: string, env: NodeJS.ProcessEnv, now: Date = new Date()): Promise<ChipState | null> {
  return (await readChipAndTier(userId, env, now)).chip;
}

/**
 * The reader's tier for error monitoring's `tier` tag (FWD Sentry plan item 2): a live plan, paid (bought from a pack or a
 * plan before, `PAID_SOURCES`), or free. Read in the chip's own reads, so the shell asks the database nothing more for it.
 */
export type ReaderTier = "plan" | "paid" | "free" | "unknown";

/** `readChip`, and the tier its reads already decide. A read that throws answers no chip and an `unknown` tier. */
export async function readChipAndTier(userId: string, env: NodeJS.ProcessEnv, now: Date = new Date()): Promise<{ chip: ChipState | null; tier: ReaderTier }> {
  let tier: ReaderTier = "unknown";
  try {
    const switchOn = paymentsEnabled(env);
    // A welcome lot or an admin's gift was never bought, so neither makes a reader "someone who has bought"
    // (`isPaidSource`); each is still a lot the allowance read below must see, so a reader holding only one reaches
    // `chipFor`, which turns them away when nothing is held.
    const [sources, subscription] = await Promise.all([
      readLotSources(userId),
      readPlanFacts(userId),
    ]);
    const everBought = boughtFrom(sources);
    const planHeld = planCardFacts(subscription, {}, now).state !== "offer";
    tier = planHeld ? "plan" : everBought ? "paid" : "free";
    if (!switchOn && sources.length === 0 && !planHeld) return { chip: null, tier };
    return { chip: chipFor({ allowance: await readAllowance(userId, now), switchOn, everBought, planHeld }, now), tier };
  } catch {
    // The tier stands once its two reads have answered, whatever fails after them (the allowance read).
    return { chip: null, tier };
  }
}
