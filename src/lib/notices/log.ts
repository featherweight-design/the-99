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

const ENTRY_CHUNK = 1000;

/** What one ingest run reports about its log writes. `seqs`, when a caller passes an array, collects
 *  the exact sequence numbers written, so a probe can delete what it wrote and nothing else. */
export type LogReport = { written: number; lost: number; seqs?: number[] };

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
      // In chunks: five parameters a row against Postgres's 65,535 per statement means one insert
      // tops out near 13,000 entries, and an upstream reshuffle of the combo index can exceed that.
      for (let i = 0; i < entries.length; i += ENTRY_CHUNK) {
        const inserted = await savepoint.insert(deckDataChanges).values(
          entries.slice(i, i + ENTRY_CHUNK)
            .map((e) => ({ kind: e.kind, direction: e.direction, oracleIds: e.oracleIds, detail: e.detail })),
        ).returning({ seq: deckDataChanges.seq });
        report.seqs?.push(...inserted.map((r) => r.seq));
      }
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
 * The log's head: the highest `seq` written, or 0 for an empty log. A reading stores it as
 * `seen_seq`, read BEFORE the compute, so an entry published while the compute runs is still
 * reported against that reading (plan D3).
 *
 * NULL WHEN UNREADABLE, never 0. A reading stored at 0 has "seen" nothing, so a transient failure
 * here would put every entry in the log's history in front of the player as new. The caller takes
 * the head inside its own write instead (`LOG_HEAD_SQL`), which can only err towards quiet.
 */
export async function readLogHead(exec: Executor): Promise<number | null> {
  try {
    const result = await exec.execute(LOG_HEAD_SQL);
    const row = (result as unknown as { rows: Array<{ head: string | number }> }).rows[0];
    return Number(row?.head ?? 0);
  } catch (error) {
    console.warn(`deck notices: change log head unreadable; the write takes it instead: ${message(error)}`);
    return null;
  }
}

/** The head as an SQL expression, for a write that could not read it first. */
export const LOG_HEAD_SQL = sql`select coalesce(max(seq), 0)::bigint as head from deck_data_changes`;

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

// ---------------------------------------------------------------------------------------------
// The Combo refresh's two diffs (brief §6). Flags publish in their own transaction before the bulk,
// variants in a second; each diff is written inside its own publish.

/** The two flags the verdict reads from `card_bracket_flags`. `tutor` is not one of them: the
 *  verdict classifies tutors from oracle text, so a tutor-flag change moves no stored analysis. */
export type FlagFacts = { massLandDenial: boolean; extraTurn: boolean };

/** Entries for every card whose mass land denial or extra-turn flag moved, either way. A card
 *  absent from a side has neither flag on that side (an absent id means no flag applies). */
export function diffFlags(
  before: ReadonlyMap<string, FlagFacts>,
  after: ReadonlyArray<FlagFacts & { oracleId: string }>,
): ChangeEntry[] {
  const next = new Map(after.map((r) => [r.oracleId, r]));
  const ids = [...new Set([...before.keys(), ...next.keys()])].sort();
  const none: FlagFacts = { massLandDenial: false, extraTurn: false };
  const entries: ChangeEntry[] = [];
  for (const id of ids) {
    const was = before.get(id) ?? none;
    const now = next.get(id) ?? none;
    if (was.massLandDenial !== now.massLandDenial) {
      entries.push({ kind: "massLandDenial", direction: now.massLandDenial ? "added" : "removed", oracleIds: [id], detail: {} });
    }
    if (was.extraTurn !== now.extraTurn) {
      entries.push({ kind: "extraTurns", direction: now.extraTurn ? "added" : "removed", oracleIds: [id], detail: {} });
    }
  }
  return entries;
}

/** A combo the verdict would count, reduced to what an entry needs (`isCountedCombo`). */
export type CountedCombo = {
  variantId: string;
  /** Its two pieces, sorted: a deck must hold both for the entry to touch it. */
  pieces: string[];
  /** The pieces that only work from the command zone; checked against the deck on read (D5). */
  mustBeCommander: string[];
  produces: string[];
};

/**
 * Entries for every COUNTED combo Spellbook added or removed (plan D7). A variant whose row changed
 * while it stayed counted writes nothing, and neither does one that was never counted. The entry
 * keeps the card names and the result at diff time (readiness F16), because a removed variant's
 * row is gone after the publish.
 */
export function diffCombos(
  before: ReadonlyMap<string, CountedCombo>,
  after: ReadonlyMap<string, CountedCombo>,
  nameOf: (oracleId: string) => string,
): ChangeEntry[] {
  const entry = (c: CountedCombo, direction: ChangeDirection): ChangeEntry => ({
    kind: "combo",
    direction,
    oracleIds: c.pieces,
    detail: { variantId: c.variantId, names: c.pieces.map(nameOf), produces: c.produces, mustBeCommander: c.mustBeCommander },
  });
  const added = [...after.values()].filter((c) => !before.has(c.variantId)).map((c) => entry(c, "added"));
  const removed = [...before.values()].filter((c) => !after.has(c.variantId)).map((c) => entry(c, "removed"));
  return [...added, ...removed].sort((a, b) =>
    String(a.detail.variantId).localeCompare(String(b.detail.variantId)));
}
