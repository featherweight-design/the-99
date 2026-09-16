// The database half of the stored support list. Kept apart from
// `support-overlap.ts` because that one is imported by `score.ts`, which client
// components reach — see the note there, and `client-bundle-safety.test.ts`,
// which caught the two being one file.

import { inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { commanderSupport } from "../../db/schema";
import type { SupportList } from "./support-overlap";
import type { EdhrecTag } from "./parse";

/**
 * The SQL, exported so its shape can be asserted without a database.
 *
 * ONE STATEMENT, and that is the point rather than an optimisation. Two selects
 * — a header read and a card read — do not share a snapshot: each runs as its
 * own statement under read-committed, while `seed-index.ts:58` replaces a
 * header and its child rows in ONE transaction. So a monthly rebuild committing
 * between two reads yields a list with the old `edhrec_total` and the new card
 * ids, and a score computed against no index generation at all. A single
 * statement sees one snapshot by construction.
 *
 * THE ORDER IS LOAD-BEARING and is asserted by rendering this SQL, because
 * nothing downstream can see it: `supportOverlap` receives an already-ordered
 * array, so dropping the `order by` would leave every unit test green while the
 * receipts line named three arbitrary cards.
 */
export function supportListsQuery(commanderOracleIds: string[]) {
  return db
    .select({
      oracleId: commanderSupport.commanderOracleId,
      total: commanderSupport.edhrecTotal,
      // `coalesce` to an empty array rather than null: a commander with a
      // header and no resolved cards is a real reading of zero overlap, and the
      // caller should not have to tell that apart from a missing row twice.
      oracleIds: sql<string[]>`coalesce((
        select array_agg(csc.oracle_id order by csc.inclusion desc nulls last, csc.oracle_id)
        from commander_support_cards csc
        where csc.commander_oracle_id = ${commanderSupport}.commander_oracle_id
      ), '{}')`,
    })
    .from(commanderSupport)
    .where(inArray(commanderSupport.commanderOracleId, commanderOracleIds));
}

/**
 * The stored support list for each commander asked about.
 *
 * A commander with no `commander_support` row is ABSENT from the map, which
 * `scoreCommander` reads as "no synergy reading" — the same thing a null `total`
 * means to it.
 *
 * THE CARD ORDER IS INCLUSION-DESCENDING, and that is a DELIBERATE CHANGE to
 * what the receipts line names rather than a restoration of it. `overlapOwned`
 * feeds `receiptsPreview`, which prints the first three, and those three used
 * to come off `parseEdhrecPayload`'s flattened `topCards`.
 *
 * That flattened array is NOT inclusion-ordered — measured, 0 of 25 cached
 * payloads are, with inclusions running `6.8, 4.2, 3.1, 1.9, 1.5, 64.3, 58.1`
 * because the parser concatenates several cardlist sections, each sorted within
 * itself. So the old first three were the first three of EDHREC's first
 * section; the new ones are the three most-included support cards the reader
 * owns. The index stores `inclusion` but no POSITION, so the original order
 * cannot be reconstructed from it — restoring it would mean persisting the
 * position and rebuilding the index.
 *
 * Inclusion-descending is the defensible reading of "the support you own", and
 * it is stable across rebuilds where a section order is not. Recorded as a
 * change so nobody reads it as an accident.
 */
export async function loadSupportLists(
  commanderOracleIds: string[],
): Promise<Map<string, SupportList>> {
  if (commanderOracleIds.length === 0) return new Map();
  const rows = await supportListsQuery(commanderOracleIds);
  return new Map(rows.map((r) => [r.oracleId, { total: r.total, oracleIds: r.oracleIds }]));
}

/**
 * The commander-level facts the shared row draws, for a set of commanders.
 *
 * The owned lane needs this and the discover lane does not: `loadCandidates`
 * drives off `commander_support` and so has these columns already, while the
 * owned lane's list comes from `commander_scores` — a per-user cache that holds
 * scoring figures and nothing about the commander itself.
 *
 * SEPARATE FROM `loadSupportLists` because they are read for different reasons
 * and cost different amounts. That one aggregates `commander_support_cards`,
 * hundreds of rows per commander, to score with; this one is three columns off
 * one row per commander, to draw with. Folding them would make every row-draw
 * pay for an aggregate it never reads.
 *
 * These columns are NOT per-user, which is why they are read here rather than
 * stored on `commander_scores`: one sentence and one tag list serve every
 * player, and copying them per reader into a cache invalidated by that reader's
 * collection would store the same text thousands of times and rewrite it on
 * every upload.
 */
export type SupportMeta = {
  prose: string | null;
  tags: EdhrecTag[];
  deckCount: number | null;
};

/** Exported for the same reason `supportListsQuery` is: the projection decides
    what the row can draw, and it can be asserted without a database. */
export function supportMetaQuery(commanderOracleIds: string[]) {
  return db
    .select({
      oracleId: commanderSupport.commanderOracleId,
      prose: commanderSupport.prose,
      tags: commanderSupport.tags,
      deckCount: commanderSupport.deckCount,
    })
    .from(commanderSupport)
    .where(inArray(commanderSupport.commanderOracleId, commanderOracleIds));
}

export async function loadSupportMeta(
  commanderOracleIds: string[],
): Promise<Map<string, SupportMeta>> {
  if (commanderOracleIds.length === 0) return new Map();
  const rows = await supportMetaQuery(commanderOracleIds);

  return new Map(
    rows.map((r) => [r.oracleId, { prose: r.prose, tags: r.tags, deckCount: r.deckCount }]),
  );
}
