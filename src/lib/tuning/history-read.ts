import { and, asc, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "../../db";
import type { ChipContext } from "./cuts-count";
import { reapCutoff } from "./reaper";
import {
  cards, deckCutItems, deckSuggestionItems, deckSuggestionRuns, deckToolCounts,
} from "../../db/schema";
import {
  decodeCursor, pastCutChips, HISTORY_PAGE, keyUuid, mergePage, pastVerdict, runOutcome, RUN_TOOL_OF,
  shapeCount, shapeRun, type CountRecord, type HistoryKey, type HistoryPage, type HistoryTool, type PastRun,
  type RunRecord, type RunStatus,
} from "./history";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Both sources order and page on `created_at` cut to the millisecond, the precision the cursor
 * carries, then the row's own uuid: so a page boundary never skips a row stored a fraction of a
 * millisecond away from the key.
 */
const runAt = sql`date_trunc('milliseconds', ${deckSuggestionRuns.createdAt})`;
const countAt = sql`date_trunc('milliseconds', ${deckToolCounts.createdAt})`;

/** The keyset predicate on one source, exported so its emitted SQL is pinned by a test. */
export function pastKey(at: SQL, id: typeof deckSuggestionRuns.id | typeof deckToolCounts.id, key: HistoryKey | null): SQL | undefined {
  if (!key) return undefined;
  return sql`(${at}, ${id}) < (${key.at}::timestamp, ${keyUuid(key)}::uuid)`;
}

/** The paid runs' page query, built apart from running it so the test can render it. */
export function runsPageQuery(tx: Pick<Tx, "select">, deckId: string, userId: string, runTools: string[], key: HistoryKey | null, limit: number) {
  return tx.select({
    id: deckSuggestionRuns.id,
    tool: deckSuggestionRuns.tool,
    status: deckSuggestionRuns.status,
    errorClass: deckSuggestionRuns.errorClass,
    createdAt: deckSuggestionRuns.createdAt,
    validationReport: deckSuggestionRuns.validationReport,
  }).from(deckSuggestionRuns)
    .where(and(
      eq(deckSuggestionRuns.deckId, deckId),
      eq(deckSuggestionRuns.userId, userId),
      inArray(deckSuggestionRuns.tool, runTools),
      pastKey(runAt, deckSuggestionRuns.id, key),
    ))
    .orderBy(desc(runAt), desc(deckSuggestionRuns.id))
    .limit(limit + 1);
}

export function countsPageQuery(tx: Pick<Tx, "select">, deckId: string, userId: string, countTools: string[], key: HistoryKey | null, limit: number) {
  return tx.select({
    id: deckToolCounts.id,
    tool: deckToolCounts.tool,
    createdAt: deckToolCounts.createdAt,
    summary: deckToolCounts.summary,
  }).from(deckToolCounts)
    .where(and(
      eq(deckToolCounts.deckId, deckId),
      eq(deckToolCounts.userId, userId),
      inArray(deckToolCounts.tool, countTools),
      pastKey(countAt, deckToolCounts.id, key),
    ))
    .orderBy(desc(countAt), desc(deckToolCounts.id))
    .limit(limit + 1);
}

const emptyItems = { total: 0, adds: 0, cuts: 0, acceptedAdds: 0, acceptedCuts: 0, accepted: 0, dismissed: 0 };

/**
 * One page of a deck's History, newest first: the paid runs and the free counts, merged. One
 * repeatable-read snapshot, so a run settling between the statements never shows a status that
 * never sat beside its items. Filtered by reader AND deck: another player's deck id reads empty.
 */
export async function readHistory(
  deckId: string,
  userId: string,
  opts: { tool?: HistoryTool; cursor?: string | null; limit?: number; drawn: readonly HistoryTool[] },
  now: Date = new Date(),
): Promise<HistoryPage> {
  const limit = opts.limit ?? HISTORY_PAGE;
  const key = decodeCursor(opts.cursor);
  // Only the tools this deployment draws: a tool whose switch is off has no chip and cannot be
  // opened, so its runs are not listed or counted either.
  const tools = opts.tool ? opts.drawn.filter((t) => t === opts.tool) : opts.drawn;
  const runTools = tools.flatMap((t) => (RUN_TOOL_OF[t].run ? [RUN_TOOL_OF[t].run!] : []));
  const countTools = tools.flatMap((t) => RUN_TOOL_OF[t].counts);

  const { runs, counts } = await db.transaction(async (tx) => {
    // One after the other: a transaction is one connection.
    const runRows = runTools.length ? await runsPageQuery(tx, deckId, userId, runTools, key, limit) : [];
    const countRows = countTools.length ? await countsPageQuery(tx, deckId, userId, countTools, key, limit) : [];
    const okIds = (tool: string) => runRows.filter((r) => r.tool === tool && r.status === "ok").map((r) => r.id);
    const sIds = okIds("suggested_changes");
    const cIds = okIds("proposed_cuts");
    const s = deckSuggestionItems;
    const suggested = sIds.length === 0 ? [] : await tx.select({
      runId: s.runId,
      total: sql<number>`count(*)::int`,
      adds: sql<number>`(count(*) filter (where ${s.addOracleId} is not null))::int`,
      cuts: sql<number>`(count(*) filter (where ${s.cutOracleId} is not null))::int`,
      acceptedAdds: sql<number>`(count(*) filter (where ${s.verdict} = 'accepted' and ${s.addOracleId} is not null))::int`,
      acceptedCuts: sql<number>`(count(*) filter (where ${s.verdict} = 'accepted' and ${s.cutOracleId} is not null))::int`,
      accepted: sql<number>`(count(*) filter (where ${s.verdict} = 'accepted'))::int`,
      dismissed: sql<number>`(count(*) filter (where ${s.verdict} = 'dismissed'))::int`,
    }).from(s).where(inArray(s.runId, sIds)).groupBy(s.runId);
    const c = deckCutItems;
    const cut = cIds.length === 0 ? [] : await tx.select({
      runId: c.runId,
      total: sql<number>`count(*)::int`,
      accepted: sql<number>`(count(*) filter (where ${c.verdict} = 'accepted'))::int`,
      dismissed: sql<number>`(count(*) filter (where ${c.verdict} = 'dismissed'))::int`,
    }).from(c).where(inArray(c.runId, cIds)).groupBy(c.runId);
    const tally = new Map<string, RunRecord["items"]>([
      ...suggested.map((t) => [t.runId, { ...t }] as const),
      ...cut.map((t) => [t.runId, { ...emptyItems, total: t.total, cuts: t.total, accepted: t.accepted, acceptedCuts: t.accepted, dismissed: t.dismissed }] as const),
    ]);
    const runs: RunRecord[] = runRows.map((r) => {
      const over = (r.validationReport as { over?: unknown } | null)?.over;
      return {
        id: r.id,
        tool: r.tool as RunRecord["tool"],
        status: r.status as RunStatus,
        errorClass: r.errorClass,
        createdAt: r.createdAt,
        askedOver: typeof over === "number" ? over : null,
        items: tally.get(r.id) ?? emptyItems,
      };
    });
    const counts: CountRecord[] = countRows.map((r) => ({ ...r, tool: r.tool as CountRecord["tool"] }));
    return { runs, counts };
  }, { isolationLevel: "repeatable read" });

  return mergePage(runs.map((r) => shapeRun(r, now)), counts.map(shapeCount), key, limit);
}

/** The History tile's figures: every run and count on the deck, and the runs in flight. Takes the
 *  caller's transaction, so the hub's landing stays one read. */
export async function readHistoryCountIn(
  tx: Tx, deckId: string, userId: string, now: Date, drawn: readonly HistoryTool[],
): Promise<{ runs: number; running: number }> {
  // Aggregates in SQL: runs are kept for as long as the deck is, and this read repeats every few
  // seconds while a run is in flight, so it returns two numbers rather than every row.
  const runTools = drawn.flatMap((t) => (RUN_TOOL_OF[t].run ? [RUN_TOOL_OF[t].run!] : []));
  const countTools = drawn.flatMap((t) => RUN_TOOL_OF[t].counts);
  const [paid] = runTools.length === 0 ? [{ n: 0, running: 0 }] : await tx.select({
    n: sql<number>`count(*)::int`,
    // In flight: pending and inside the reaper's cutoff, as `runOutcome` reads a row.
    running: sql<number>`(count(*) filter (where ${deckSuggestionRuns.status} = 'pending' and ${deckSuggestionRuns.createdAt} >= ${reapCutoff(now)}))::int`,
  }).from(deckSuggestionRuns)
    .where(and(eq(deckSuggestionRuns.deckId, deckId), eq(deckSuggestionRuns.userId, userId), inArray(deckSuggestionRuns.tool, runTools)));
  const [counted] = countTools.length === 0 ? [{ n: 0 }] : await tx.select({ n: sql<number>`count(*)::int` }).from(deckToolCounts)
    .where(and(eq(deckToolCounts.deckId, deckId), eq(deckToolCounts.userId, userId), inArray(deckToolCounts.tool, countTools)));
  return { runs: (paid?.n ?? 0) + (counted?.n ?? 0), running: paid?.running ?? 0 };
}

// A past run carries no version and no "changed by N" figure: a run reads the LIVE list, which may
// hold edits no committed version has, and no run stores the list it read, so neither figure could
// be stated truthfully. The note reads without one (`pastNoteUncounted`).

const addCard = alias(cards, "add_card");
const cutCard = alias(cards, "cut_card");

/**
 * One past run, read-only: a paid run's lines with their verdicts, or a free count's summary.
 * Null when the id names nothing this reader holds on this deck.
 */
export async function readPastRun(
  deckId: string,
  userId: string,
  ref: { kind: "run" | "count"; uuid: string },
  now: Date = new Date(),
): Promise<PastRun | null> {
  return db.transaction(async (tx) => {
    if (ref.kind === "count") {
      const [row] = await tx.select().from(deckToolCounts)
        .where(and(eq(deckToolCounts.id, ref.uuid), eq(deckToolCounts.deckId, deckId), eq(deckToolCounts.userId, userId))).limit(1);
      if (!row) return null;
      const shaped = shapeCount({ ...row, tool: row.tool as CountRecord["tool"] });
      return { kind: "count", tool: shaped.tool, at: shaped.at, readVersion: null, moved: null, summary: shaped.summary };
    }
    const [run] = await tx.select({
      id: deckSuggestionRuns.id,
      tool: deckSuggestionRuns.tool,
      status: deckSuggestionRuns.status,
      createdAt: deckSuggestionRuns.createdAt,
      validationReport: deckSuggestionRuns.validationReport,
      errorClass: deckSuggestionRuns.errorClass,
    }).from(deckSuggestionRuns)
      .where(and(eq(deckSuggestionRuns.id, ref.uuid), eq(deckSuggestionRuns.deckId, deckId), eq(deckSuggestionRuns.userId, userId))).limit(1);
    if (!run) return null;
    const outcome = runOutcome(run.status as RunStatus, run.createdAt, now, run.errorClass);
    const at = run.createdAt.toISOString();
    if (run.tool === "proposed_cuts") {
      const lines = await tx.select({ cut: cards.name, reason: deckCutItems.reason, verdict: deckCutItems.verdict, evidence: deckCutItems.evidence })
        .from(deckCutItems).innerJoin(cards, eq(cards.oracleId, deckCutItems.cutOracleId))
        .where(eq(deckCutItems.runId, run.id)).orderBy(asc(deckCutItems.position));
      return {
        kind: "cutsDeeper", at, outcome, readVersion: null, moved: null,
        // The chips as they read that day: quoted from the figures the run stored beside its report.
        lines: lines.map((l) => ({
          cut: l.cut, reason: l.reason, verdict: pastVerdict(l.verdict),
          cites: pastCutChips(l.evidence, l.reason, (run.validationReport as { chips?: ChipContext } | null)?.chips ?? null),
        })),
      };
    }
    const lines = await tx.select({ cut: cutCard.name, add: addCard.name, verdict: deckSuggestionItems.verdict, reason: deckSuggestionItems.rationale, evidence: deckSuggestionItems.evidence })
      .from(deckSuggestionItems)
      .leftJoin(cutCard, eq(cutCard.oracleId, deckSuggestionItems.cutOracleId))
      .leftJoin(addCard, eq(addCard.oracleId, deckSuggestionItems.addOracleId))
      .where(eq(deckSuggestionItems.runId, run.id)).orderBy(asc(deckSuggestionItems.position));
    return {
      kind: "suggested", at, outcome, readVersion: null, moved: null,
      lines: lines.map((l) => ({ cut: l.cut, add: l.add, verdict: pastVerdict(l.verdict), reason: l.reason, cites: (l.evidence ?? []).map((e) => e.value) })),
    };
  }, { isolationLevel: "repeatable read" });
}
