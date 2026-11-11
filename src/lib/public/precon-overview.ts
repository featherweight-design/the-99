import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "../../db";
import { cards, preconCards, preconSynopses, precons } from "../../db/schema";
import { catalogGeneration } from "../cache/catalog-generation";
import { DEPLOYMENT_ID } from "../cache/deployment";
import { cachedWhen } from "../cache/stored-when";
import { overviewForList, renderedPreconList, showsPreconOverview } from "../precons/overview-rule";
import { synopsisPreconContractVersion } from "../precons/synopsis-contract";
import type { CheckedSynopsis } from "../synopsis/types";

/**
 * A precon's pre-written Overview for the public landing page (plan `2026-11-08-public-landing-demo.md`, PR 1: "Featured
 * precon Overview"). CATALOG ONLY: `precon_synopses`, `precons` and `precon_cards`, nothing about a reader. NOT WIRED to
 * any page yet.
 *
 * WHICH ROW: the precon build writes every Overview at contract 13 on the `labels` basis (`synopsisPreconContractVersion`
 * with the v2 method; the v1 contract, 9, has nothing built at it). The signed-in precon page picks the contract from the
 * reader's switch (`precons/overview-read.ts`); a public page has no reader, so it takes the contract the rows are
 * written at. Only a PLAIN precon is featured: a Collector's Edition twin (`twin_of`) has no row of its own.
 *
 * WHEN IT IS SHOWN: the signed-in page's own rule, shared (`precons/overview-rule.ts`): the row is current with a
 * non-empty Overview (`showsPreconOverview`), and it was written for the list the precon holds NOW (`overviewForList`
 * against `renderedPreconList`), since the ingest can move `precon_cards` without touching `current`. One definition,
 * `shownOverviews`, serves the single read, the list and the landing's count (`landing-stats.ts`).
 */
export const PUBLIC_OVERVIEW_CONTRACT = synopsisPreconContractVersion(true);
export const PUBLIC_OVERVIEW_BASIS = "labels" as const;

export type PublicPreconOverview = {
  fileName: string;
  name: string;
  setCode: string;
  content: CheckedSynopsis;
};

/**
 * What the landing's Overview teaser needs beside the row (addendum A2 section 6): the precon's face commander (its art crop and
 * colour identity for the card, its id for the stages shape's commander image), the catalog art for every card the Overview names
 * and every card its claims cite, the cited names, and the contract the row is at (the shape the modal draws). CATALOG ONLY:
 * `precon_cards` and `cards`, the same reads `precons/overview-read.ts` makes for the signed-in page, restated here so the public
 * surface does not reach it.
 */
export type PublicPreconTeaser = PublicPreconOverview & {
  contractVersion: number;
  commander: { oracleId: string; name: string; artCropUri: string | null; colorIdentity: string[] } | null;
  art: Record<string, string | null>;
  evidenceNames: Record<string, string>;
};

/** A plain precon that has an Overview to show. */
export type PreconWithOverview = { fileName: string; name: string };

/** What a read needs: `db` itself, or the transaction it is run in. */
type Reader = Pick<typeof db, "select">;

/**
 * The candidate rows (one precon's, or every precon's): current, at the public contract and basis, for a plain precon. The
 * Overview's content and the list check are judged in code, by the shared rule. Exported so its shape is pinned.
 */
export function overviewCandidatesQuery(fileName: string | null, q: Reader = db) {
  return q.select({
    fileName: precons.fileName, name: precons.name, setCode: precons.setCode,
    content: preconSynopses.content, current: preconSynopses.current, listFingerprint: preconSynopses.listFingerprint,
  })
    .from(preconSynopses)
    .innerJoin(precons, eq(precons.fileName, preconSynopses.preconFile))
    .where(and(
      fileName === null ? undefined : eq(preconSynopses.preconFile, fileName),
      eq(preconSynopses.current, true),
      eq(preconSynopses.contractVersion, PUBLIC_OVERVIEW_CONTRACT),
      eq(preconSynopses.roleBasis, PUBLIC_OVERVIEW_BASIS),
      isNull(precons.twinOf),
    ))
    .orderBy(asc(precons.name), asc(precons.fileName));
}

/** The precons' lists as the precon page renders them: every line, in the feed's order. Exported so its shape is pinned. */
export function preconListsQuery(fileNames: string[], q: Reader = db) {
  return q.select({ fileName: preconCards.fileName, oracleId: preconCards.oracleId, quantity: preconCards.quantity, isCommander: preconCards.isCommander })
    .from(preconCards)
    .where(inArray(preconCards.fileName, fileNames))
    .orderBy(asc(preconCards.fileName), asc(preconCards.position));
}

type Line = { oracleId: string; quantity: number; isCommander: boolean };

/** Pure: the fingerprint of a precon's list from its lines, with its commanders taken as the precon page takes them. */
export function linesFingerprint(lines: readonly Line[]): string {
  const commanders: { oracleId: string }[] = [];
  for (const l of lines) if (l.isCommander && !commanders.some((c) => c.oracleId === l.oracleId)) commanders.push({ oracleId: l.oracleId });
  return renderedPreconList({ row: { commanders }, cards: lines });
}

/** Uncached: the Overviews a public page may show, by the shared rule. A failed read throws. */
export async function shownOverviews(fileName: string | null, q: Reader = db): Promise<PublicPreconOverview[]> {
  const rows = (await overviewCandidatesQuery(fileName, q)).filter((r) => showsPreconOverview(r));
  if (rows.length === 0) return [];
  const byFile = new Map<string, Line[]>();
  for (const l of await preconListsQuery(rows.map((r) => r.fileName), q)) {
    const lines = byFile.get(l.fileName) ?? [];
    lines.push(l);
    byFile.set(l.fileName, lines);
  }
  return rows
    .filter((r) => overviewForList(r, linesFingerprint(byFile.get(r.fileName) ?? [])) !== null)
    .map(({ fileName: f, name, setCode, content }) => ({ fileName: f, name, setCode, content }));
}

/** Uncached: the precon's Overview, or null when it has none to show. A failed read throws. */
export async function loadPublicPreconOverview(fileName: string, q: Reader = db): Promise<PublicPreconOverview | null> {
  return (await shownOverviews(fileName, q))[0] ?? null;
}

/** Uncached: the precon's Overview with the teaser's extras, or null when it has none to show. A failed read throws. */
export async function loadPublicPreconTeaser(fileName: string, q: Reader = db): Promise<PublicPreconTeaser | null> {
  const overview = await loadPublicPreconOverview(fileName, q);
  if (!overview) return null;
  const lines = await preconListsQuery([fileName], q);
  const commanderId = lines.find((l) => l.isCommander)?.oracleId ?? null;
  // Every card any claim cites (`allEvidenceIds`, restated: that module reaches the deck facts, which a public loader may not).
  const cited = [...new Set(Object.values(overview.content.evidence ?? {}).flat(2))];
  const named = [...new Set([...Object.values(overview.content.cards).map((c) => c.oracleId), ...cited, ...(commanderId ? [commanderId] : [])])];
  const rows = named.length === 0 ? [] : await q.select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri, artCropUri: cards.artCropUri, colorIdentity: cards.colorIdentity }).from(cards).where(inArray(cards.oracleId, named));
  const lead = rows.find((r) => r.oracleId === commanderId);
  return {
    ...overview,
    contractVersion: PUBLIC_OVERVIEW_CONTRACT,
    commander: lead ? { oracleId: lead.oracleId, name: lead.name, artCropUri: lead.artCropUri, colorIdentity: lead.colorIdentity } : null,
    art: Object.fromEntries(rows.map((r) => [r.oracleId, r.imageUri])),
    evidenceNames: Object.fromEntries(rows.filter((r) => cited.includes(r.oracleId)).map((r) => [r.oracleId, r.name])),
  };
}

/** Uncached: every plain precon with an Overview to show, by name then file. A failed read throws. */
export async function loadPreconsWithOverview(q: Reader = db): Promise<PreconWithOverview[]> {
  return (await shownOverviews(null, q)).map(({ fileName, name }) => ({ fileName, name }));
}

/**
 * Cached through `cachedWhen` (`cache/stored-when.ts`), keyed on the catalog generation and the deployment like the card
 * page's read, so every ingest that stamps `catalog_refreshes` (the precon ingest among them) retires the entry.
 *
 * AN HOUR, NOT A DAY: the Overview copy (`scripts/copy-precon-overviews.ts`) writes `precon_synopses` and its `current`
 * flag WITHOUT stamping the generation, so a copy that installs, retires or restamps an Overview reaches these entries only
 * through the window. The landing's count is this list's length, so the two never disagree.
 *
 * A single Overview is stored only when found, so a file nobody has stores nothing. The list is stored whatever it holds
 * (an empty list included): it is one entry, and the window bounds how long it lags a copy. A failed read throws through.
 * Both are wrapped in `React.cache` too, so one request reads each once.
 */
export const PUBLIC_PRECON_OVERVIEW_REVALIDATE_S = 60 * 60;

/** The cache keys' parts, exported so a test can pin that the catalog moving moves the key. */
export function publicPreconOverviewKey(generation: string, fileName: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-precon-overview", `gen:${generation}`, `dep:${deployment}`, `file:${fileName}`];
}

export function publicPreconTeaserKey(generation: string, fileName: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-precon-teaser", `gen:${generation}`, `dep:${deployment}`, `file:${fileName}`];
}

export function preconsWithOverviewKey(generation: string, deployment: string = DEPLOYMENT_ID): string[] {
  return ["public-precons-with-overview", `gen:${generation}`, `dep:${deployment}`];
}

export const readPublicPreconTeaser = cache(async (fileName: string): Promise<PublicPreconTeaser | null> =>
  cachedWhen(publicPreconTeaserKey(await catalogGeneration(), fileName), () => loadPublicPreconTeaser(fileName), (v) => v !== null, PUBLIC_PRECON_OVERVIEW_REVALIDATE_S));

export const readPublicPreconOverview = cache(async (fileName: string): Promise<PublicPreconOverview | null> =>
  cachedWhen(publicPreconOverviewKey(await catalogGeneration(), fileName), () => loadPublicPreconOverview(fileName), (v) => v !== null, PUBLIC_PRECON_OVERVIEW_REVALIDATE_S),
);

export const readPreconsWithOverview = cache(async (): Promise<PreconWithOverview[]> =>
  cachedWhen(preconsWithOverviewKey(await catalogGeneration()), () => loadPreconsWithOverview(), () => true, PUBLIC_PRECON_OVERVIEW_REVALIDATE_S),
);
