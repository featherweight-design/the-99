/**
 * The deck notices change log: what the weekly ingests write when bracket-relevant data moves
 * under the cards a deck holds (brief §2.3, plan D2).
 *
 * Two halves. The PURE one decides, from what a batch held before its upsert and what it holds
 * after, which entries the log gets. The WRITE runs inside the ingest's own transaction, non-fatally.
 */

import { sql } from "drizzle-orm";

import type { db } from "../../db";
import { deckDataChanges } from "../../db/schema";

/** Every kind of entry the log carries. `rules` is the one kind that is not card-scoped. */
export type ChangeKind = "gameChanger" | "massLandDenial" | "extraTurns" | "combo" | "rules" | "notLegal";

export type ChangeDirection = "added" | "removed" | "moved";

export type ChangeEntry = {
  kind: ChangeKind;
  direction: ChangeDirection;
  /** Every card a deck must hold for this entry to touch it. Empty for `rules`. */
  oracleIds: string[];
  detail: Record<string, unknown>;
};

/** The two catalog facts a card batch can move. */
export type CardFacts = { gameChanger: boolean; commanderLegal: boolean };

/**
 * The entries one card batch writes.
 *
 * A card with no row BEFORE the batch writes nothing: it is new to the catalog, so no deck can
 * hold it and no stored analysis was computed against it. That is not a gap in the log; the next
 * analysis of a deck that adds it reads its current facts.
 *
 * Legality logs only the BAN (legal → not legal). The standing "not legal" state is derived live
 * from the deck's cards (plan D6); the entry exists only to date the ban. A card that becomes
 * legal again leaves the live check on its own, so it writes nothing.
 */
export function diffCardBatch(
  before: ReadonlyMap<string, CardFacts>,
  after: ReadonlyArray<CardFacts & { oracleId: string }>,
): ChangeEntry[] {
  const entries: ChangeEntry[] = [];
  for (const row of after) {
    const was = before.get(row.oracleId);
    if (!was) continue;
    if (was.gameChanger !== row.gameChanger) {
      entries.push({
        kind: "gameChanger",
        direction: row.gameChanger ? "added" : "removed",
        oracleIds: [row.oracleId],
        detail: {},
      });
    }
    if (was.commanderLegal && !row.commanderLegal) {
      entries.push({ kind: "notLegal", direction: "added", oracleIds: [row.oracleId], detail: {} });
    }
  }
  return entries;
}

// ---------------------------------------------------------------------------------------------
// The write. NEVER THE REASON AN INGEST FAILS (plan D13, `stamp-catalog.ts`'s rule): the ingests
// run weekly against production from a workflow that never runs `db:migrate`, so the first run
// after this ships can meet a database with no log table at all.


type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = Pick<typeof db, "execute">;

/** What one ingest run reports about its log writes. */
export type LogReport = { written: number; lost: number };

export const emptyLogReport = (): LogReport => ({ written: 0, lost: 0 });

/**
 * Whether the log table exists, asked ONCE per run. When it does not, the run writes no entries
 * and says so once, rather than failing every batch's savepoint.
 */
export async function logTableExists(exec: Executor): Promise<boolean> {
  try {
    const result = await exec.execute(sql`select to_regclass('public.deck_data_changes') is not null as ok`);
    const row = (result as unknown as { rows: Array<{ ok: boolean }> }).rows[0];
    const ok = row?.ok === true;
    if (!ok) console.warn("deck notices: no deck_data_changes table on this database; this run logs nothing");
    return ok;
  } catch (error) {
    console.warn(`deck notices: could not check for the change log, logging nothing: ${message(error)}`);
    return false;
  }
}

/**
 * Writes one batch's entries inside the caller's transaction, in a SAVEPOINT. A failed write rolls
 * back the savepoint alone: the batch's own upsert, earlier in the same transaction, still commits.
 * The loss is counted in `report` and warned, never thrown.
 */
export async function writeEntries(tx: Tx, entries: readonly ChangeEntry[], report: LogReport): Promise<void> {
  if (entries.length === 0) return;
  try {
    await tx.transaction(async (savepoint) => {
      await savepoint.insert(deckDataChanges).values(
        entries.map((e) => ({ kind: e.kind, direction: e.direction, oracleIds: e.oracleIds, detail: e.detail })),
      );
    });
    report.written += entries.length;
  } catch (error) {
    report.lost += entries.length;
    console.warn(`deck notices: ${entries.length} change log entries lost: ${message(error)}`);
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The log's head: the highest `seq` written, or 0. A reading stores it as `seen_seq`, read BEFORE
 * the compute, so an entry published while the compute runs is still reported against that
 * reading (plan D3). Non-fatal: a database without the log has no entries, and 0 says as much.
 */
export async function readLogHead(exec: Executor): Promise<number> {
  try {
    const result = await exec.execute(sql`select coalesce(max(seq), 0)::bigint as head from deck_data_changes`);
    const row = (result as unknown as { rows: Array<{ head: string | number }> }).rows[0];
    return Number(row?.head ?? 0);
  } catch (error) {
    console.warn(`deck notices: change log head unreadable, reading as 0: ${message(error)}`);
    return 0;
  }
}

/** The cards a reading analyzed, commanders included, sorted and distinct (plan D5). */
export function analyzedOracleIds(head: {
  commanderOracleId: string;
  partnerOracleId: string | null;
  cards: ReadonlyArray<{ oracleId: string }>;
}): string[] {
  const ids = new Set<string>([head.commanderOracleId, ...head.cards.map((c) => c.oracleId)]);
  if (head.partnerOracleId) ids.add(head.partnerOracleId);
  return [...ids].sort();
}
