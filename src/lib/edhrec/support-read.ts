// The database half of the stored support list. Kept apart from
// `support-overlap.ts` because that one is imported by `score.ts`, which client
// components reach — see the note there, and `client-bundle-safety.test.ts`,
// which caught the two being one file.

import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { commanderSupport, commanderSupportCards } from "../../db/schema";
import type { SupportList } from "./support-overlap";

/**
 * The stored support list for each commander asked about.
 *
 * A commander with no `commander_support` row is ABSENT from the map, which
 * `scoreCommander` reads as "no synergy reading" — the same thing a null `total`
 * means to it. A commander with a row but no resolved cards is present with an
 * empty `oracleIds`, which is a real reading of zero overlap rather than an
 * absence of one.
 *
 * Two queries rather than a join: the header carries one row per commander and
 * the cards carry ~250, so joining would repeat every total that many times.
 */
export async function loadSupportLists(
  commanderOracleIds: string[],
): Promise<Map<string, SupportList>> {
  if (commanderOracleIds.length === 0) return new Map();

  const [headers, cards] = await Promise.all([
    db
      .select({
        oracleId: commanderSupport.commanderOracleId,
        total: commanderSupport.edhrecTotal,
      })
      .from(commanderSupport)
      .where(inArray(commanderSupport.commanderOracleId, commanderOracleIds)),
    db
      .select({
        commanderOracleId: commanderSupportCards.commanderOracleId,
        oracleId: commanderSupportCards.oracleId,
      })
      .from(commanderSupportCards)
      .where(inArray(commanderSupportCards.commanderOracleId, commanderOracleIds)),
  ]);

  const out = new Map<string, SupportList>();
  for (const h of headers) out.set(h.oracleId, { total: h.total, oracleIds: [] });
  for (const c of cards) {
    // A support-card row whose header is missing would be a foreign-key
    // violation, so this is a guard rather than a case — but it keeps the map's
    // invariant local instead of resting on the constraint.
    const entry = out.get(c.commanderOracleId);
    if (entry) entry.oracleIds.push(c.oracleId);
  }
  return out;
}
