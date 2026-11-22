import { and, count, eq, isNull, notInArray, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "../../db";
import { cards, commanderSupport, precons, printings, spellbookVariants } from "../../db/schema";
import { catalogGeneration } from "../cache/catalog-generation";
import { DEPLOYMENT_ID } from "../cache/deployment";
import { cachedWhen } from "../cache/stored-when";
import { SUPPRESSED_ORACLE_IDS } from "../prose/suppressed";
import { loadPreconsWithOverview, readPreconsWithOverview } from "./precon-overview";

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

/** The figures that are a count of their own; `preconOverviews` is the featured list's length instead. */
export type LandingCountKey = Exclude<LandingStatKey, "preconOverviews">;

/** Only the figures that were read. A key that is absent is a count that failed. */
export type LandingStats = Partial<Record<LandingStatKey, number>>;

/** What a read needs: `db` itself, or the transaction it is run in. */
type Reader = Pick<typeof db, "select">;

/** Pure: the commander page's prose rule in SQL. An ok read, prose that is not blank, and not on the suppressed list. */
export function proseShownWhere(suppressed: ReadonlySet<string> = SUPPRESSED_ORACLE_IDS) {
  return and(
    eq(commanderSupport.synergyState, "ok"),
    sql`btrim(coalesce(${commanderSupport.prose}, '')) <> ''`,
    // The list is empty today; a `not in ()` is not valid SQL, so an empty list adds no condition.
    suppressed.size === 0 ? undefined : notInArray(commanderSupport.commanderOracleId, [...suppressed]),
  );
}

/**
 * One query per counted figure, exported so each one's shape is pinned from its rendered SQL.
 *
 * - `commanders`: every commander the EDHREC index holds a row for (`commander_support`), the set a commander page exists for.
 * - `commandersWithProse`: those whose page draws a sentence, by the public commander page's own rule (`commander.ts`,
 *   `shapeCommander`): the read is `ok`, the prose is not blank, and the commander is not suppressed (`isSuppressed`).
 * - `precons` / `plainPrecons`: every precon file, and those that are not a Collector's Edition twin (`twin_of` null).
 * - `combos`: Commander Spellbook variants. `cards` / `printings`: the catalog.
 *
 * `preconOverviews` is not here: it is the length of the featured list (`precon-overview.ts`), so the count and the list
 * share one rule, one key and one window and cannot disagree.
 */
export const LANDING_STAT_QUERIES: Record<LandingCountKey, (q?: Reader) => PromiseLike<{ n: number | string }[]>> = {
  commanders: (q = db) => q.select({ n: count() }).from(commanderSupport),
  commandersWithProse: (q = db) => q.select({ n: count() }).from(commanderSupport).where(proseShownWhere()),
  precons: (q = db) => q.select({ n: count() }).from(precons),
  plainPrecons: (q = db) => q.select({ n: count() }).from(precons).where(isNull(precons.twinOf)),
  combos: (q = db) => q.select({ n: count() }).from(spellbookVariants),
  cards: (q = db) => q.select({ n: count() }).from(cards),
  printings: (q = db) => q.select({ n: count() }).from(printings),
};

const COUNT_KEYS = Object.keys(LANDING_STAT_QUERIES) as LandingCountKey[];

/** Pure: a driver's count as a figure, or null when it is not a finite whole number at or above zero. */
export function statValue(raw: unknown): number | null {
  const n = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw;
  return typeof n === "number" && Number.isInteger(n) && n >= 0 ? n : null;
}

/** One count, uncached: the figure, or null when the query throws or answers no usable count. */
export async function loadLandingStat(key: LandingCountKey, q: Reader = db): Promise<number | null> {
  try {
    const [row] = await LANDING_STAT_QUERIES[key](q);
    return statValue(row?.n);
  } catch (error) {
    // not a fallback: the figure is left out, which the page draws as no figure at all.
    console.error(`landing stats: the ${key} count could not be read`, error);
    return null;
  }
}

/** Collects the figures that were read; a null leaves its key out. */
function collect(entries: readonly (readonly [LandingStatKey, number | null])[]): LandingStats {
  const stats: LandingStats = {};
  for (const [key, value] of entries) if (value !== null) stats[key] = value;
  return stats;
}

/** Every figure, uncached (the probe's read; a page uses `readLandingStats`). */
export async function loadLandingStats(q: Reader = db): Promise<LandingStats> {
  return collect(await Promise.all([
    ...COUNT_KEYS.map(async (key) => [key, await loadLandingStat(key, q)] as const),
    loadPreconsWithOverview(q).then(
      (list) => ["preconOverviews", list.length] as const,
      (error) => {
        console.error("landing stats: the precon Overview list could not be read", error);
        return ["preconOverviews", null] as const;
      },
    ),
  ]));
}

/** Whether every figure was read. */
export function completeStats(stats: LandingStats): boolean {
  return ([...COUNT_KEYS, "preconOverviews"] as LandingStatKey[]).every((k) => stats[k] !== undefined);
}

/**
 * THE COUNTS CACHED AS ONE ENTRY through `cachedWhen` (`cache/stored-when.ts`), keyed on the catalog generation and the
 * deployment, so every ingest and index copy (which stamp `catalog_refreshes`) retires it, and a new build retires a shape
 * it changed. One entry and not one per count: every cached read is a round trip to Vercel's data cache, and the signed-out
 * landing made one per count, seven identical calls in a render (Sentry THE-99-D, an N+1). Only a COMPLETE set is stored:
 * a failed count is served as missing and not stored, so the next request reads the counts again (seven cheap queries).
 * The counts move only when the catalog does, so a day's revalidate is a backstop.
 *
 * `preconOverviews` is `readPreconsWithOverview`'s length: the featured list's own entry, key and hour window.
 *
 * If the cache itself throws (`unstable_cache` outside a request), the counts are logged and left out, as a failed count
 * is; nothing is read again. Wrapped in `React.cache` too, so one request reads once.
 */
export const LANDING_STATS_REVALIDATE_S = 60 * 60 * 24;

/** The counts' cache key, exported so a test can pin that the catalog moving moves the key. */
export function landingStatsKey(generation: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-landing-stats", `gen:${generation}`, `dep:${deployment}`];
}

/** Every count, uncached, as one object: what the single cache entry holds. */
async function loadLandingCounts(): Promise<LandingStats> {
  return collect(await Promise.all(COUNT_KEYS.map(async (key) => [key, await loadLandingStat(key)] as const)));
}

const countsComplete = (counts: LandingStats): boolean => COUNT_KEYS.every((k) => counts[k] !== undefined);

async function logged(key: LandingStatKey, read: () => Promise<number | null>): Promise<readonly [LandingStatKey, number | null]> {
  try {
    return [key, await read()] as const;
  } catch (error) {
    console.error(`landing stats: the ${key} figure could not be read`, error);
    return [key, null] as const;
  }
}

async function readLandingCounts(generation: string): Promise<LandingStats> {
  try {
    return await cachedWhen(landingStatsKey(generation), loadLandingCounts, countsComplete, LANDING_STATS_REVALIDATE_S);
  } catch (error) {
    console.error("landing stats: the counts could not be read", error);
    return {};
  }
}

export const readLandingStats = cache(async (): Promise<LandingStats> => {
  const generation = await catalogGeneration();
  const [counts, overviews] = await Promise.all([
    readLandingCounts(generation),
    logged("preconOverviews", async () => (await readPreconsWithOverview()).length),
  ]);
  return { ...counts, ...collect([overviews]) };
});
