/**
 * The one read a precon start makes (small items 5, PR 6a): the precon's stored Overview and its stored
 * reading, in one row. The rules that judge each are `reading-rule.ts` (the reading) and
 * `carryOverDecision` (the Overview).
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { decks, preconSynopses } from "../../db/schema";
import type { RoleBasis } from "../profile/build";
import type { CheckedSynopsis } from "../synopsis/types";
import { readingMoved } from "../notices/read";
import { preconReadingCurrent, preconReadingOf, type PreconReading, type PreconReadingColumns } from "./reading-rule";

/** What a start reads to carry a precon over: its Overview and its reading, in one row. */
export type PreconCarry = {
  overview: {
    listFingerprint: string;
    contractVersion: number;
    model: string;
    content: CheckedSynopsis;
    current: boolean;
    createdAt: Date;
    checkedAt: Date;
  };
  /** Null when none is stored; judged by `preconReadingCurrent`, not by `overview.current`. */
  reading: PreconReading | null;
};

/**
 * Which precon: its file, or THE DECK a start made from it (`decks.built_from_precon`, owner-scoped in the
 * same statement), so an arrival reads the precon's row beside the deck's own reads instead of after them.
 */
export type PreconOf = string | { deckId: string; userId: string };

/** The columns `readPreconCarry` selects, apart so a test can render the statement. */
export function preconCarryQuery(of: PreconOf, contract: number, basis: RoleBasis, q: Pick<typeof db, "select"> = db) {
  const file = typeof of === "string"
    ? eq(preconSynopses.preconFile, of)
    : sql`${preconSynopses.preconFile} = (select d.built_from_precon from ${decks} d where d.id = ${of.deckId}::uuid and d.user_id = ${of.userId})`;
  return q.select({
    listFingerprint: preconSynopses.listFingerprint, contractVersion: preconSynopses.contractVersion, model: preconSynopses.model,
    content: preconSynopses.content, current: preconSynopses.current, createdAt: preconSynopses.createdAt, checkedAt: preconSynopses.checkedAt,
    reading: preconSynopses.reading, readingPermits: preconSynopses.readingPermits, readingList: preconSynopses.readingList,
    readingCatalog: preconSynopses.readingCatalog, readingProfileVersion: preconSynopses.readingProfileVersion,
    readingRulesVersion: preconSynopses.readingRulesVersion, readingAnalyzedOracleIds: preconSynopses.readingAnalyzedOracleIds,
    readingSeenSeq: preconSynopses.readingSeenSeq, readingAt: preconSynopses.readingAt,
  }).from(preconSynopses).where(and(
    file, eq(preconSynopses.contractVersion, contract), eq(preconSynopses.roleBasis, basis),
  ));
}

/**
 * ONE QUERY: a precon's stored Overview and its stored reading at the owner's contract and role basis,
 * current or not (the caller judges each by its own rule). Null when the precon has no row there.
 */
export async function readPreconCarry(
  of: PreconOf,
  contract: number,
  basis: RoleBasis,
  q: Pick<typeof db, "select"> = db,
): Promise<PreconCarry | null> {
  const [row] = await preconCarryQuery(of, contract, basis, q);
  if (!row) return null;
  const { listFingerprint, contractVersion, model, content, current, createdAt, checkedAt, ...reading } = row;
  return {
    overview: { listFingerprint, contractVersion, model, content, current, createdAt, checkedAt },
    reading: preconReadingOf(reading),
  };
}

/**
 * Whether the data under a stored reading moved since it was computed: a change log entry touching its
 * cards past its `seen_seq`, a ban of one, or new bracket rules (`readingMoved`, the H1 rule a press
 * recomputes on). One query on the database `src/db` names.
 */
export function preconReadingMoved(r: PreconReading): Promise<boolean> {
  return readingMoved({
    seenSeq: r.seenSeq, rulesVersion: r.rulesVersion, analyzedOracleIds: r.analyzedOracleIds,
    commanderOracleIds: r.profile.commanderOracleIds,
  });
}

/** Stored columns' `moved` for `preconReadingDue`: false with nothing current to move (the pure half decides). */
export async function preconColumnsMoved(c: PreconReadingColumns, list: string): Promise<boolean> {
  const r = preconReadingOf(c);
  return preconReadingCurrent(r, { list }) ? preconReadingMoved(r) : false;
}

/**
 * Whether a precon's stored reading is what an Analyze press would store for a deck holding `list` now:
 * current for the list and this code, and nothing under it moved. What a start copies, or not.
 */
export async function preconReadingFresh(r: PreconReading | null, list: string): Promise<boolean> {
  return preconReadingCurrent(r, { list }) && !(await preconReadingMoved(r));
}
