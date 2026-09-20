import { eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderScores, commanderSupport, commanderSupportCards } from "../../db/schema";
import { SCORE_INDEX_LOCK } from "../recs/store";
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
  /** Injectable for the same reason as `write`: the build is unit-tested
      without a database, and this is the run's last write. */
  clearScores?: () => Promise<void>;
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
          avgLand: sql`excluded.avg_land`,
          avgBasic: sql`excluded.avg_basic`,
          avgNonbasic: sql`excluded.avg_nonbasic`,
          avgCreature: sql`excluded.avg_creature`,
          avgInstant: sql`excluded.avg_instant`,
          avgSorcery: sql`excluded.avg_sorcery`,
          avgArtifact: sql`excluded.avg_artifact`,
          avgEnchantment: sql`excluded.avg_enchantment`,
          avgPlaneswalker: sql`excluded.avg_planeswalker`,
          avgBattle: sql`excluded.avg_battle`,
          avgCurve: sql`excluded.avg_curve`,
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
 * Throws away every persisted commander score.
 *
 * Separate from `writeToDb` because it is not per-commander: it runs once, after
 * the whole rebuild, and the reasoning for that is at the call site.
 */
async function clearPersistedScores(): Promise<void> {
  await db.transaction(async (tx) => {
    // EXCLUSIVE against every in-flight score write — see `SCORE_INDEX_LOCK`.
    // Without it the delete can land between a writer's generation check and
    // its inserts, and those pre-rebuild rows survive the clear. In a
    // transaction because `pg_advisory_xact_lock` is released at commit, and a
    // bare statement would hold it for no span at all.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${SCORE_INDEX_LOCK}, 0))`,
    );
    await tx.delete(commanderScores);
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
  const clearScores = opts.clearScores ?? clearPersistedScores;
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

  // EVERY PERSISTED SCORE IS NOW STALE, so every one goes.
  //
  // Ruling D made `commander_scores.fit_synergy` a function of this table. A
  // rebuild therefore invalidates scores the way a deployment does — except the
  // writer version cannot express it, being a code constant that this workflow
  // does not change. Without this, `loadScores` keeps serving the old Fit from a
  // warm set while Commander Details scores from the new index, which is exactly
  // the cross-surface disagreement Ruling D exists to remove, reintroduced
  // monthly.
  //
  // ALL ROWS, not the rebuilt commanders' rows. `loadScores` detects a set with
  // a stale SENTINEL and cannot detect one with rows DELETED out of it — that
  // blindness is why `SCORE_WRITER_CURRENT` was invented (see its note in
  // `schema.ts`). Deleting per commander would leave partial sets served as
  // whole. Clearing the table leaves every reader with a full set or none, and
  // a miss costs one recompute.
  //
  // WHAT THIS DOES NOT REACH, stated because it is a real window rather than an
  // oversight. `/commanders` wraps its payload in `cacheForUser`, so a warm
  // account can keep receiving the pre-rebuild Fit for up to that cache's hour
  // ceiling while Commander Details reads the new index. This delete only
  // guarantees that a cache MISS recomputes correctly.
  //
  // Accepted rather than closed, on the precedent already in the code: the
  // rankings cache carries the same hour of staleness after a DEPLOY, and
  // `rankings.ts` says so in as many words — "survives the deploy for up to the
  // hour ceiling for every reader who does not write". An index rebuild is the
  // same class of event on a monthly cadence, so the exposure is one hour a
  // month against a figure that is itself a monthly snapshot.
  //
  // Closing it needs an index-generation token in the cache key, which costs a
  // read on every request to that route, or a revalidation call this workflow
  // cannot make — it runs as a script with no Next request context, which is
  // why nothing here calls `revalidateUserLists`. Both are larger than the
  // window they would close.
  //
  // NOR IS THIS A BARRIER AGAINST A CONCURRENT SCORE WRITE on its own, and that
  // one is a race rather than a staleness window: a request can read the support
  // data before this delete, finish its fanout after it, and upsert a set
  // computed against the old index.
  //
  // THAT RACE IS CLOSED, on the other side and with a lock. `persistScores`
  // takes `SCORE_INDEX_LOCK` shared, then re-reads
  // `max(commander_support.computed_at)` and abandons the write if it moved
  // since the caller captured it; the clear below takes the same lock
  // exclusively. The comparison alone was not enough — it proves the index had
  // not moved at the instant it ran, not at commit — so a delete landing
  // between a writer's check and its inserts would leave pre-rebuild rows
  // behind. This delete handles the ordinary case, that guard handles the raced
  // one, and neither is sufficient alone.
  //
  // An earlier revision of this comment described the race as open and named a
  // migration plus a reader-side check as the fix. Neither was built: the guard
  // reuses the shape the collection generation already had, which costs no
  // migration and no read-path query. The claim outlived the change by one PR.
  //
  // Only when the index could actually have moved. A run that failed every
  // commander changed no input, and throwing away every reader's scores for it
  // would be a self-inflicted cold start.
  //
  // `skipped` is in the condition because of the RESUME path. `r.commanders`
  // counts this invocation's writes only, and `alreadyComputedSince` exists so
  // an interrupted build can be dispatched again to finish — so a resume whose
  // remaining commanders were all written by the aborted attempt writes nothing,
  // skips thousands, and would have left every score computed against the
  // previous index. The workflow supports that path explicitly, which is what
  // makes gating on writes alone wrong rather than merely narrow.
  if (r.commanders > 0 || r.skipped > 0) {
    await clearScores();
    console.log("commander-index: cleared persisted commander scores");
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
