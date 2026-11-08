import { eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { db } from "../../db";
import { cards, commanderSupport } from "../../db/schema";
import { catalogGeneration } from "../cache/catalog-generation";
import { DEPLOYMENT_ID } from "../cache/deployment";
import { cachedWhen } from "../cache/stored-when";
import { isSuppressed } from "../prose/suppressed";

/**
 * The three commanders the landing's hero phone draws (public landing PR 4a): the Commanders page of a made-up player, so only
 * the art, the colors and the stored read are real, and the fit figure beside each is the example's own (`copy/landing.ts`).
 * CATALOG ONLY (`cards`, `commander_support`): no reader's collection is read, and the same three come back for everyone.
 *
 * A commander the catalog does not hold as a commander is left out, and so is its card: the page draws the phone from what
 * came back and drops it when none did, never a placeholder in a named commander's place.
 */
export const LANDING_COMMANDER_NAMES = ["Jace, Multiverse Architect", "Y'shtola, Night's Blessed", "Tam, the Possibility"] as const;

export type LandingCommander = {
  name: string;
  colorIdentity: string[];
  /** The art crop for the phone's row, or null when the catalog has none. */
  artCropUri: string | null;
  /** The whole card, for the cards beside the phone. */
  imageUri: string | null;
  /** The stored read, only while the read is `ok` and the commander is not suppressed (the public commander page's rule). */
  prose: string | null;
};

/** What a read needs: `db` itself, or the transaction it is run in. */
type Reader = Pick<typeof db, "select">;

/**
 * Exported so its shape is pinned. The names are Scryfall's own, straight apostrophe included, as the catalog stores them;
 * a name the catalog spells another way is simply not found, and the phone drops its row.
 */
export function landingCommandersQuery(q: Reader = db) {
  return q.select({
    name: cards.name, colorIdentity: cards.colorIdentity, artCropUri: cards.artCropUri, imageUri: cards.imageUri,
    oracleId: cards.oracleId, state: commanderSupport.synergyState, prose: commanderSupport.prose,
  }).from(cards)
    .innerJoin(commanderSupport, eq(commanderSupport.commanderOracleId, cards.oracleId))
    .where(inArray(cards.name, [...LANDING_COMMANDER_NAMES]))
    .orderBy(cards.oracleId);
}

/**
 * Pure: the rows as the page draws them, in the order the names are listed, each name once. A name can match several catalog
 * rows (a reprint under another oracle id), so the choice is fixed: a row whose read is `ok` first, then the lowest oracle id,
 * which the same request always gets (the commander page addresses a commander by oracle id, `commander.ts`).
 */
export function shapeLandingCommanders(rows: readonly Awaited<ReturnType<typeof landingCommandersQuery>>[number][]): LandingCommander[] {
  const out: LandingCommander[] = [];
  for (const name of LANDING_COMMANDER_NAMES) {
    const row = rows.filter((r) => r.name === name)
      .sort((a, b) => Number(b.state === "ok") - Number(a.state === "ok") || (a.oracleId < b.oracleId ? -1 : a.oracleId > b.oracleId ? 1 : 0))[0];
    if (!row) continue;
    const ok = row.state === "ok" && !isSuppressed(row.oracleId) && (row.prose ?? "").trim() !== "";
    out.push({ name: row.name, colorIdentity: row.colorIdentity, artCropUri: row.artCropUri, imageUri: row.imageUri, prose: ok ? row.prose : null });
  }
  return out;
}

export const LANDING_COMMANDERS_REVALIDATE_S = 60 * 60 * 24;

/** The cache key, exported so a test can pin that the catalog moving moves it. */
export function landingCommandersKey(generation: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-landing-commanders", `gen:${generation}`, `dep:${deployment}`];
}

/**
 * The three commanders, cached on the catalog generation and the deployment (every index copy stamps `catalog_refreshes`).
 * Only a COMPLETE answer is stored: a commander missing today is looked for again on the next request. A read that fails
 * is logged and answers no commanders, so the page draws without the phone rather than failing.
 */
export const readLandingCommanders = cache(async (): Promise<LandingCommander[]> => {
  try {
    return await cachedWhen(
      landingCommandersKey(await catalogGeneration()),
      async () => shapeLandingCommanders(await landingCommandersQuery()),
      (list) => list.length === LANDING_COMMANDER_NAMES.length,
      LANDING_COMMANDERS_REVALIDATE_S,
    );
  } catch (error) {
    // not a fallback to a made-up row: the phone is left out, which the page draws as no phone at all.
    console.error("landing commanders: the read failed", error);
    return [];
  }
});
