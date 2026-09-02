import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport, commanderSupportCards } from "../../db/schema";
import { isCommanderCandidate } from "../recs/score";
import { fetchEdhrecUncached, type EdhrecFetchResult } from "./client";
import {
  buildNameIndex, toSupportRows,
  type IndexCommander, type SupportCard, type SupportHeader,
} from "./index-build";

// EDHREC serves this JSON for free and asks nothing of us; a quarter-second
// between requests keeps a ~3,000-commander run under an hour while staying
// far below any rate a human browsing the site would produce.
const DEFAULT_DELAY_MS = 250;
const CARD_BATCH_SIZE = 500;

export type BuildIndexOptions = {
  loadCommanders?: () => Promise<IndexCommander[]>;
  loadNameIndex?: () => PromiseLike<{ oracleId: string; name: string }[]>;
  loadAlreadyComputed?: () => Promise<Set<string>>;
  fetch?: (name: string) => Promise<EdhrecFetchResult>;
  write?: (header: SupportHeader, cards: SupportCard[]) => Promise<void>;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

export type BuildIndexResult = {
  /** Headers actually written — `ok` plus `absent`. Degraded ones are not written. */
  commanders: number;
  cardRows: number;
  degraded: number; absent: number; unresolved: number;
  skipped: number; failed: number;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function loadCommandersFromDb(): Promise<IndexCommander[]> {
  const rows = await db
    .select({
      oracleId: cards.oracleId, name: cards.name,
      typeLine: cards.typeLine, oracleText: cards.oracleText,
    })
    .from(cards)
    // Both halves of the filter, in the same order the live path applies them:
    // legality in SQL (recommend.ts:120, :127), then the front-face type test in
    // TypeScript (recommend.ts:147). Dropping the legality half would index
    // banned cards and Un-set legends, diverge from what the app actually
    // recommends, and spend thousands of EDHREC fetches on commanders no user
    // can play.
    .where(eq(cards.commanderLegal, true));
  // The type test stays in TypeScript so the definition of "can be a commander"
  // has exactly one home — score.ts, where it is unit-tested and where the
  // front-face rule that kept Westvale Abbey out already lives.
  return rows.filter(isCommanderCandidate);
}

async function writeToDb(header: SupportHeader, cardRows: SupportCard[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(commanderSupport).values({ ...header, computedAt: new Date() })
      .onConflictDoUpdate({
        target: commanderSupport.commanderOracleId,
        set: {
          synergyState: sql`excluded.synergy_state`,
          edhrecTotal: sql`excluded.edhrec_total`,
          tags: sql`excluded.tags`,
          bracketCounts: sql`excluded.bracket_counts`,
          budgetCounts: sql`excluded.budget_counts`,
          similarOracleIds: sql`excluded.similar_oracle_ids`,
          deckCount: sql`excluded.deck_count`,
          rank: sql`excluded.rank`,
          saltScore: sql`excluded.salt_score`,
          engine: sql`excluded.engine`,
          computedAt: sql`excluded.computed_at`,
        },
      });
    // Delete-then-insert, not upsert: a card that left EDHREC's list must leave
    // the table too, and there is no upsert shape that removes rows.
    await tx.delete(commanderSupportCards)
      .where(sql`${commanderSupportCards.commanderOracleId} = ${header.commanderOracleId}`);
    for (let i = 0; i < cardRows.length; i += CARD_BATCH_SIZE) {
      await tx.insert(commanderSupportCards).values(cardRows.slice(i, i + CARD_BATCH_SIZE));
    }
  });
}

/**
 * Rebuilds `commander_support` and `commander_support_cards` for every card that
 * can legally be a commander.
 *
 * Every I/O edge is injectable so the whole build is unit-testable without a
 * database or a network. One commander's failure is recorded and stepped over:
 * a run of ~3,000 serial fetches that aborts on the first transient 5xx would
 * never complete, and each commander's write is independent of the others.
 */
export async function buildCommanderIndex(
  opts: BuildIndexOptions = {},
): Promise<BuildIndexResult> {
  const load = opts.loadCommanders ?? loadCommandersFromDb;
  // loadNameIndex default returns a Drizzle query builder, which is PromiseLike
  // (thenable) but not a true Promise. The declared type is PromiseLike<...>
  // rather than Promise<...> so both the injected async functions and the
  // default Drizzle query builder satisfy it without a cast.
  const loadNames = opts.loadNameIndex ??
    (() => db.select({ oracleId: cards.oracleId, name: cards.name }).from(cards));
  const fetchOne = opts.fetch ?? fetchEdhrecUncached;
  const write = opts.write ?? writeToDb;
  const sleep = opts.sleep ?? defaultSleep;
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;

  const [commanders, nameRows] = await Promise.all([load(), loadNames()]);
  const nameIndex = buildNameIndex(nameRows);
  // Spec §4/§10: state the candidate count before spending ~3,000 serial
  // fetches. The number is the run's own sanity check — a catalog regression
  // that halves it is visible in the first line of the log rather than in a
  // support table that quietly lost a thousand commanders.
  console.log(`commander-index: ${commanders.length} commander-legal candidates`);
  const already = opts.loadAlreadyComputed ? await opts.loadAlreadyComputed() : new Set<string>();

  const r: BuildIndexResult = {
    commanders: 0, cardRows: 0, degraded: 0, absent: 0,
    unresolved: 0, skipped: 0, failed: 0,
  };

  for (const commander of commanders) {
    if (already.has(commander.oracleId)) { r.skipped++; continue; }
    await sleep(delayMs);
    try {
      const result = await fetchOne(commander.name);
      const { header, cards: cardRows, unresolved } =
        toSupportRows({ commander, result, nameIndex });
      // Degraded is "we could not reach EDHREC", which is not a fact about the
      // commander. Writing it would overwrite a good row and cascade-delete its
      // support cards over one transient failure, so leave the previous row —
      // stale but true — in place and let the run summary report the count.
      if (header.synergyState === "degraded") { r.degraded++; continue; }
      await write(header, cardRows);
      r.commanders++;
      r.cardRows += cardRows.length;
      r.unresolved += unresolved;
      if (header.synergyState === "absent") r.absent++;
      // Spec §4: per-commander, not just the run total. A single commander
      // contributing hundreds of unresolved names means a name-format mismatch
      // for that page; the same count spread across the whole run is the normal
      // tail of tokens and un-set cards. The aggregate cannot tell them apart.
      if (unresolved > 0) {
        console.warn(
          `commander-index: ${commander.name} — ${unresolved} EDHREC names unresolved`,
        );
      }
    } catch (err) {
      r.failed++;
      console.error(`commander-index: ${commander.name} failed`, err);
    }
  }
  return r;
}

/**
 * Oracle ids whose support row was recomputed at or after `since` — the resume
 * set for a re-dispatched run. Keyed on the run's own start time rather than a
 * fixed age so a retry an hour later still skips what the aborted run finished.
 */
export async function alreadyComputedSince(since: Date): Promise<Set<string>> {
  const rows = await db
    .select({ oracleId: commanderSupport.commanderOracleId })
    .from(commanderSupport)
    .where(sql`${commanderSupport.computedAt} >= ${since}`);
  return new Set(rows.map((x) => x.oracleId));
}
