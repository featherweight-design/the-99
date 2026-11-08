import { and, count, countDistinct, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { db } from "../../db";
import { cards, commanderSupport, preconSynopses, precons, printings, spellbookVariants } from "../../db/schema";
import { catalogGeneration } from "../cache/catalog-generation";
import { DEPLOYMENT_ID } from "../cache/deployment";
import { PUBLIC_OVERVIEW_BASIS, PUBLIC_OVERVIEW_CONTRACT } from "./precon-overview";

/**
 * The public landing page's numbers (plan `2026-11-08-public-landing-demo.md`, PR 1). CATALOG ONLY: every figure is a
 * count over a table on the public allowlist (`scripts/lib/public-reads.mjs`), the same for every visitor. NOT WIRED to
 * any page yet: the landing (PR 4) draws them.
 *
 * A COUNT THAT FAILS IS LEFT OUT, never shown as zero: "0 commanders" is a false claim, a missing figure is a gap the
 * page draws around. A count that comes back as anything but a finite whole number is left out the same way.
 */
export type LandingStatKey =
  | "commanders"
  | "commandersWithProse"
  | "precons"
  | "plainPrecons"
  | "preconOverviews"
  | "combos"
  | "cards"
  | "printings";

/** Only the figures that were read. A key that is absent is a count that failed. */
export type LandingStats = Partial<Record<LandingStatKey, number>>;

/** What a read needs: `db` itself, or the transaction it is run in. */
type Reader = Pick<typeof db, "select">;

/**
 * One query per figure, exported so each one's shape is pinned from its rendered SQL.
 *
 * - `commanders`: every commander the EDHREC index holds a row for (`commander_support`), the set a commander page exists for.
 * - `commandersWithProse`: those whose page draws a sentence: the read is `ok` and the prose is not blank, the public
 *   commander page's own rule (`commander.ts`, `shapeCommander`).
 * - `precons` / `plainPrecons`: every precon file, and those that are not a Collector's Edition twin (`twin_of` null).
 * - `preconOverviews`: plain precons with a current Overview at the public contract and basis, the set
 *   `precon-overview.ts` features from (`preconsWithOverviewQuery`).
 * - `combos`: Commander Spellbook variants. `cards` / `printings`: the catalog.
 */
export const LANDING_STAT_QUERIES: Record<LandingStatKey, (q?: Reader) => PromiseLike<{ n: number | string }[]>> = {
  commanders: (q = db) => q.select({ n: count() }).from(commanderSupport),
  commandersWithProse: (q = db) => q.select({ n: count() }).from(commanderSupport).where(and(
    eq(commanderSupport.synergyState, "ok"),
    sql`btrim(coalesce(${commanderSupport.prose}, '')) <> ''`,
  )),
  precons: (q = db) => q.select({ n: count() }).from(precons),
  plainPrecons: (q = db) => q.select({ n: count() }).from(precons).where(isNull(precons.twinOf)),
  preconOverviews: (q = db) => q.select({ n: countDistinct(preconSynopses.preconFile) }).from(preconSynopses)
    .innerJoin(precons, eq(precons.fileName, preconSynopses.preconFile))
    .where(and(
      eq(preconSynopses.current, true),
      eq(preconSynopses.contractVersion, PUBLIC_OVERVIEW_CONTRACT),
      eq(preconSynopses.roleBasis, PUBLIC_OVERVIEW_BASIS),
      isNull(precons.twinOf),
      isNotNull(sql`${preconSynopses.content}->>'overview'`),
    )),
  combos: (q = db) => q.select({ n: count() }).from(spellbookVariants),
  cards: (q = db) => q.select({ n: count() }).from(cards),
  printings: (q = db) => q.select({ n: count() }).from(printings),
};

/** Pure: a driver's count as a figure, or null when it is not a finite whole number at or above zero. */
export function statValue(raw: unknown): number | null {
  const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
}

/** Every figure, read in parallel, uncached. A query that throws, or answers no usable count, leaves its key out. */
export async function loadLandingStats(q: Reader = db): Promise<LandingStats> {
  const keys = Object.keys(LANDING_STAT_QUERIES) as LandingStatKey[];
  const read = await Promise.all(keys.map(async (key) => {
    try {
      const [row] = await LANDING_STAT_QUERIES[key](q);
      return [key, statValue(row?.n)] as const;
    } catch {
      // not a fallback: the figure is left out, which the page draws as no figure at all.
      return [key, null] as const;
    }
  }));
  const stats: LandingStats = {};
  for (const [key, value] of read) if (value !== null) stats[key] = value;
  return stats;
}

/** Whether every figure was read. */
export function completeStats(stats: LandingStats): boolean {
  return (Object.keys(LANDING_STAT_QUERIES) as LandingStatKey[]).every((k) => stats[k] !== undefined);
}

/**
 * Cached the way the card page's read is (`cached-card.ts`): keyed on the catalog generation and the deployment, so every
 * ingest and index copy (which stamp `catalog_refreshes`) retires the entry, and a new build retires a shape it changed.
 * The counts change only when the catalog does, so a day's revalidate is a backstop, not the freshness story. One
 * exception: the Overview copy does not stamp the generation, so `preconOverviews` can lag a copy by up to that day.
 *
 * ONLY A COMPLETE SET IS STORED. A read with a failed count is served as it is and never kept, so one database hiccup
 * does not hide a figure for a day. Wrapped in `React.cache` too, so one request reads once.
 */
export const LANDING_STATS_REVALIDATE_S = 60 * 60 * 24;

/** The cache key's parts, exported so a test can pin that the catalog moving moves the key. */
export function landingStatsKey(generation: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-landing-stats", `gen:${generation}`, `dep:${deployment}`];
}

class NotStored {
  constructor(readonly stats: LandingStats) {}
}

export const readLandingStats = cache(async (): Promise<LandingStats> => {
  const stored = unstable_cache(async () => {
    const stats = await loadLandingStats();
    // Thrown, because `unstable_cache` stores whatever is returned and stores nothing that throws.
    if (!completeStats(stats)) throw new NotStored(stats);
    return stats;
  }, landingStatsKey(await catalogGeneration()), { revalidate: LANDING_STATS_REVALIDATE_S });
  try {
    return await stored();
  } catch (e) {
    if (e instanceof NotStored) return e.stats;
    // The wrapper itself failed (no incremental cache, outside a request): read through, still never a zero.
    return loadLandingStats();
  }
});
