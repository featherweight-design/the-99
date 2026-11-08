import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { db } from "../../db";
import { preconSynopses, precons } from "../../db/schema";
import { catalogGeneration } from "../cache/catalog-generation";
import { DEPLOYMENT_ID } from "../cache/deployment";
import { synopsisPreconContractVersion } from "../synopsis/limits";
import type { CheckedSynopsis } from "../synopsis/types";

/**
 * A precon's pre-written Overview for the public landing page (plan `2026-11-08-public-landing-demo.md`, PR 1: "Featured
 * precon Overview"). CATALOG ONLY: `precon_synopses` and `precons`, nothing about a reader. NOT WIRED to any page yet.
 *
 * WHICH ROW: the precon build writes every Overview at contract 13 on the `labels` basis (`synopsisPreconContractVersion`
 * with the v2 method; the v1 contract, 9, has nothing built at it). The signed-in precon page picks the contract from the
 * reader's switch (`precons/overview-read.ts`); a public page has no reader, so it takes the contract the rows are
 * written at. A row is shown only when it is `current` (its inputs still match this database's catalog) and its Overview
 * section survived the validator (`content.overview` not null), the signed-in page's `showsPreconOverview` rule. Only a
 * PLAIN precon is featured: a Collector's Edition twin (`twin_of`) has no row of its own.
 */
export const PUBLIC_OVERVIEW_CONTRACT = synopsisPreconContractVersion(true);
export const PUBLIC_OVERVIEW_BASIS = "labels" as const;

export type PublicPreconOverview = {
  fileName: string;
  name: string;
  setCode: string;
  content: CheckedSynopsis;
};

/** A plain precon that has an Overview to show. */
export type PreconWithOverview = { fileName: string; name: string };

/** What a read needs: `db` itself, or the transaction it is run in. */
type Reader = Pick<typeof db, "select">;

/** The rows a public page may show: current, at the public contract and basis, with an Overview, for a plain precon. */
const shown = () => and(
  eq(preconSynopses.current, true),
  eq(preconSynopses.contractVersion, PUBLIC_OVERVIEW_CONTRACT),
  eq(preconSynopses.roleBasis, PUBLIC_OVERVIEW_BASIS),
  isNull(precons.twinOf),
  isNotNull(sql`${preconSynopses.content}->>'overview'`),
);

/** One precon's shown Overview, by file name. Exported so its shape is pinned from the rendered SQL. */
export function preconOverviewQuery(fileName: string, q: Reader = db) {
  return q.select({ fileName: precons.fileName, name: precons.name, setCode: precons.setCode, content: preconSynopses.content })
    .from(preconSynopses)
    .innerJoin(precons, eq(precons.fileName, preconSynopses.preconFile))
    .where(and(eq(preconSynopses.preconFile, fileName), shown()))
    .limit(1);
}

/** Every plain precon with a shown Overview, by name then file. Exported so its shape is pinned from the rendered SQL. */
export function preconsWithOverviewQuery(q: Reader = db) {
  return q.select({ fileName: precons.fileName, name: precons.name })
    .from(preconSynopses)
    .innerJoin(precons, eq(precons.fileName, preconSynopses.preconFile))
    .where(shown())
    .orderBy(asc(precons.name), asc(precons.fileName));
}

/** Uncached: the precon's Overview, or null when it has none to show. A failed read throws. */
export async function loadPublicPreconOverview(fileName: string, q: Reader = db): Promise<PublicPreconOverview | null> {
  const [row] = await preconOverviewQuery(fileName, q);
  // The query asks for a non-null Overview; this re-checks the stored shape, so a malformed row is no Overview.
  if (!row || typeof row.content?.overview !== "string") return null;
  return row;
}

/** Uncached: every plain precon with an Overview to show. A failed read throws. */
export async function loadPreconsWithOverview(q: Reader = db): Promise<PreconWithOverview[]> {
  return preconsWithOverviewQuery(q);
}

/**
 * Cached the way the card page's read is (`cached-card.ts`): keyed on the catalog generation and the deployment, so every
 * ingest that stamps `catalog_refreshes` (the precon ingest among them) retires the entry.
 *
 * AN HOUR, NOT A DAY: the Overview copy (`scripts/copy-precon-overviews.ts`) writes `precon_synopses` and its `current`
 * flag WITHOUT stamping the generation, so a copy that installs, retires or restamps an Overview reaches this entry only
 * through its revalidate window. An hour bounds how long a no-longer-current Overview can stay featured.
 *
 * ONLY A FOUND OVERVIEW IS STORED: a file with none answers null and is not kept, so a name nobody has (or one the next
 * copy fills) holds nothing, and a failed read throws through. The list is stored only when it is not empty, for the same
 * reason. Both are wrapped in `React.cache` too, so one request reads each once.
 */
export const PUBLIC_PRECON_OVERVIEW_REVALIDATE_S = 60 * 60;

/** The cache keys' parts, exported so a test can pin that the catalog moving moves the key. */
export function publicPreconOverviewKey(generation: string, fileName: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-precon-overview", `gen:${generation}`, `dep:${deployment}`, `file:${fileName}`];
}

export function preconsWithOverviewKey(generation: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-precons-with-overview", `gen:${generation}`, `dep:${deployment}`];
}

class NotStored<T> {
  constructor(readonly result: T) {}
}

/** Runs `read` under `key`, storing its answer only when `keep` says so. */
async function storedWhen<T>(key: string[], read: () => Promise<T>, keep: (value: T) => boolean): Promise<T> {
  const stored = unstable_cache(async () => {
    const value = await read();
    // Thrown, because `unstable_cache` stores whatever is returned and stores nothing that throws.
    if (!keep(value)) throw new NotStored(value);
    return value;
  }, key, { revalidate: PUBLIC_PRECON_OVERVIEW_REVALIDATE_S });
  try {
    return await stored();
  } catch (e) {
    if (e instanceof NotStored) return e.result as T;
    throw e;
  }
}

export const readPublicPreconOverview = cache(async (fileName: string): Promise<PublicPreconOverview | null> =>
  storedWhen(publicPreconOverviewKey(await catalogGeneration(), fileName), () => loadPublicPreconOverview(fileName), (v) => v !== null),
);

export const readPreconsWithOverview = cache(async (): Promise<PreconWithOverview[]> =>
  storedWhen(preconsWithOverviewKey(await catalogGeneration()), () => loadPreconsWithOverview(), (v) => v.length > 0),
);
