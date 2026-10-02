import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import {
  cards, commanderScores, commanderSupport, commanderSupportCards,
  commanderPairSupport, commanderPairSupportCards, decks, identityComposition,
} from "../../db/schema";
import { SCORE_INDEX_LOCK } from "../recs/store";
import { choosePairs, LEGAL_PAIR_FLOOR, legalPairs, pairKey, type IndexPair } from "./pair-enumerate";
import { deriveRoleTargets, roleTargetsPublishable, ROLE_TARGET_FLOOR } from "./role-targets";
import { isCommanderCandidate } from "../recs/score";
import { edhrecInit, fetchEdhrecUncached, type EdhrecFetchResult } from "./client";
import {
  canonicalPair, fetchPair, toPairRows,
  type PairCardRow, type PairHeaderRow,
} from "./pair";
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
  /** The role-target pass, injectable for the same reason as every other edge here: the whole
      build is unit-testable without a database or a network. */
  deriveRoleTargets?: (written: RunWrites) => Promise<RoleTargetPassResult>;
  /**
   * The pair pass's three I/O edges, injectable for the same reason every other edge here is:
   * this function is unit-tested, and a default that reaches the database would make every
   * one of those tests hit a real Postgres. `loadPairs` defaulting to a real query is what
   * broke them the first time.
   */
  /**
   * REQUIRED, with no default, and deliberately. The real loader sweeps every legal partner
   * pair — about 1,700 — so a caller that forgot to inject it sent each one to live EDHREC and
   * wrote it: `probe:score-lock` did exactly that the day the sweep widened. Typecheck now
   * makes every caller choose, and the job passes `loadPairs` itself.
   */
  loadPairs: () => Promise<IndexPair[] | LoadedPairs>;
  /** Canonical `a|b` keys of pairs already recomputed since a resume point — the pair twin of
      `loadAlreadyComputed`. Without it a resumed run refetches every legal pair. */
  loadAlreadyComputedPairs?: () => Promise<Set<string>>;
  fetchPair?: (nameA: string, nameB: string) => Promise<EdhrecFetchResult>;
  writePair?: (header: PairHeaderRow, cards: PairCardRow[]) => Promise<void>;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

/** What the role pass reports back. */
export type RoleTargetPassResult = {
  written: number;
  pairsWritten: number;
  zeroWipes: number;
};

export type BuildIndexResult = {
  /** Headers actually written — `ok` plus `absent`. Degraded ones are not written. */
  commanders: number;
  /** Commanders whose four role targets were derived and written by the final pass. */
  roleTargets: number;
  /** Pairs whose four role targets were derived and written by the same pass. */
  pairRoleTargets: number;
  cardRows: number;
  degraded: number; absent: number; unresolved: number;
  skipped: number; failed: number;
  /** Partner pairs whose own EDHREC page was fetched and stored: every legal pair, plus every
      pair a deck holds. */
  pairs: number; pairCardRows: number; pairsFailed: number; pairsDegraded: number;
  /** Pairs a resumed run found already recomputed and did not fetch again. */
  pairsSkipped: number;
  /** Legal pairs the catalog formed this run, or null when the loader did not enumerate. */
  legalPairs: number | null;
  /** Why the legal sweep was refused, or null. The built pairs are still fetched. */
  pairRefusal: string | null;
  /** Unresolvable names on PAIR pages, kept apart from the commander total for the same
   *  reason the degraded counts are kept apart. */
  pairsUnresolved: number;
};

/**
 * The pair name map's own filter, extracted so its emitted SQL can be pinned.
 *
 * `any(...)::uuid[]` rather than a bare array: an uncast JS array against a uuid column
 * fails at RUNTIME, on a monthly job, which is the worst place to find out. The repo's rule
 * — emitted SQL proves the question — applies even to a filter this simple, because nothing
 * short of running the job would otherwise say so.
 *
 * What the test proves is the CAST, not that the filter is applied: every unit test here
 * injects `loadPairs`, so nothing reaches the call site. Dropping the `.where` would go
 * unreported, and the honest statement of that is this sentence rather than a check that
 * does not exist.
 */
export function pairNameFilter(oracleIds: string[]) {
  return sql`${cards.oracleId} = any(${sql.param(oracleIds)}::uuid[])`;
}

/**
 * Distinct partner pairs someone has actually built, with both names.
 *
 * Normalised through `canonicalPair` at the point of use rather than in SQL, so there is one
 * definition of the order and it lives beside the CHECK constraint that enforces it.
 */
async function loadBuiltPairs(): Promise<IndexPair[]> {
  const rows = await db
    .selectDistinct({
      a: decks.commanderOracleId,
      b: decks.partnerOracleId,
    })
    .from(decks)
    .where(sql`${decks.partnerOracleId} is not null`);

  if (rows.length === 0) return [];
  // Keyed to the ids these pairs actually name, not the whole catalog. The commander index
  // DOES read every card — `loadNameIndex` resolves EDHREC's names against all of them and
  // has no smaller key to use — but this map answers a bounded question, and the two reads
  // are close enough together for the wrong one to look like the house pattern.
  const pairIds = [...new Set(rows.flatMap((r) => (r.b ? [r.a, r.b] : [])))];
  const names = new Map(
    (
      await db
        .select({ oracleId: cards.oracleId, name: cards.name })
        .from(cards)
        .where(pairNameFilter(pairIds))
    ).map((c) => [c.oracleId, c.name]),
  );
  const seen = new Set<string>();
  const out: { a: string; b: string; nameA: string; nameB: string }[] = [];
  for (const row of rows) {
    if (!row.b) continue;
    const pair = canonicalPair(row.a, row.b);
    const key = `${pair.commanderOracleId}|${pair.partnerOracleId}`;
    // Two decks can carry the same pair in opposite column orders; canonical dedupe is what
    // makes that one page fetched once rather than twice.
    if (seen.has(key)) continue;
    const nameA = names.get(pair.commanderOracleId);
    const nameB = names.get(pair.partnerOracleId);
    if (!nameA || !nameB) continue;
    seen.add(key);
    out.push({ a: pair.commanderOracleId, b: pair.partnerOracleId, nameA, nameB });
  }
  return out;
}

/**
 * What the pair pass sweeps: every legal pair the catalog forms (`legalPairs`), and every pair
 * a deck holds. The legal sweep is refused below `LEGAL_PAIR_FLOOR`, and a refusal still
 * returns the built pairs — the ones indexed before this sweep existed — so a short
 * enumeration costs the widening and never the pairs the index already carried.
 */
export type LoadedPairs = { pairs: IndexPair[]; legal: number; refusal: string | null };

export async function loadPairs(floor: number = LEGAL_PAIR_FLOOR): Promise<LoadedPairs> {
  const built = await loadBuiltPairs();
  // Narrowed in SQL to cards whose text carries a partner ability at the START of a line, the
  // same anchoring `partnerAbility` uses; `legalPairs` then decides. A loose prefilter costs a
  // row of JavaScript, and the rule itself has one home.
  const sources = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine,
      oracleText: cards.oracleText, layout: cards.layout, manaCost: cards.manaCost,
    })
    .from(cards)
    .where(sql`${cards.commanderLegal} and (${cards.oracleText} ~* '(^|\n)partner' or ${cards.oracleText} ~* '(^|\n)friends forever')`);
  return choosePairs(legalPairs(sources), built, floor);
}

/**
 * Canonical `a|b` keys of pairs recomputed at or after `since` — the resume set for pairs, on
 * the same terms as `alreadyComputedSince`.
 */
export async function alreadyComputedPairsSince(since: Date): Promise<Set<string>> {
  const rows = await db
    .select({ a: commanderPairSupport.commanderOracleId, b: commanderPairSupport.partnerOracleId })
    .from(commanderPairSupport)
    .where(sql`${commanderPairSupport.computedAt} >= ${since}`);
  return new Set(rows.map((x) => pairKey(x)));
}

/**
 * The index pass's own pair fetch: no cache read, no cache write, for the same two reasons
 * `fetchEdhrecUncached` skips both — a 30-day TTL would re-serve rows fetched 29 days ago and
 * stamp them current, and caching every page is hundreds of MB of jsonb for pairs nobody owns.
 *
 * It goes through `fetchPair` rather than a second copy of the URL logic, because the
 * redirect stub is the trap and one follow is the only safe number.
 */
function fetchPairPage(nameA: string, nameB: string) {
  return fetchPair(nameA, nameB, (url) => fetch(url, edhrecInit()));
}

async function writePair(header: PairHeaderRow, cardRows: PairCardRow[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(commanderPairSupport).values(header).onConflictDoUpdate({
      target: [commanderPairSupport.commanderOracleId, commanderPairSupport.partnerOracleId],
      set: {
        synergyState: sql`excluded.synergy_state`,
        edhrecTotal: sql`excluded.edhrec_total`,
        deckCount: sql`excluded.deck_count`,
        rank: sql`excluded.rank`,
        bracketCounts: sql`excluded.bracket_counts`,
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
        computedAt: sql`now()`,
      },
    });
    // Delete-then-insert, not upsert: a card that left the pair's list must leave the table,
    // and no upsert shape removes rows. Same reasoning as the single-commander write.
    await tx.delete(commanderPairSupportCards).where(
      sql`${commanderPairSupportCards.commanderOracleId} = ${header.commanderOracleId}
          and ${commanderPairSupportCards.partnerOracleId} = ${header.partnerOracleId}`,
    );
    for (let i = 0; i < cardRows.length; i += CARD_BATCH_SIZE) {
      await tx.insert(commanderPairSupportCards).values(cardRows.slice(i, i + CARD_BATCH_SIZE));
    }
  });
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function loadCommandersFromDb(): Promise<IndexCommander[]> {
  const rows = await db
    .select({
      oracleId: cards.oracleId, name: cards.name,
      typeLine: cards.typeLine, oracleText: cards.oracleText,
      // Both read by isCommanderCandidate, which refuses a melded card (#712).
      layout: cards.layout, manaCost: cards.manaCost,
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
          // THE ROLE COLUMNS ARE DELIBERATELY ABSENT HERE. They belong to
          // `deriveAndWriteRoleTargets`, which clears and fills them in ONE transaction at the
          // end of the run — so a refusal there leaves every previous figure standing, exactly
          // as its message claims.
          //
          // An earlier version reset them from `excluded` alongside the type columns. That
          // fixed the absent-commander case and broke a larger one: these upserts land per
          // commander, hundreds of transactions before the pass gets to validate its coverage,
          // so a refusal afterwards left the rewritten commanders cleared and the untouched
          // ones intact — the mixed dataset the refusal exists to prevent, under a message
          // saying nothing had changed.
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
  await db.transaction((tx) => clearPersistedScoresIn(tx));
}

/**
 * The clear's body, on a transaction the caller owns. `db:copy:index` runs it inside its
 * publish, so old scores are never served against the copied index and a copy that fails to
 * clear them rolls back whole.
 */
export async function clearPersistedScoresIn(tx: Pick<typeof db, "execute" | "delete">): Promise<void> {
  // EXCLUSIVE against every in-flight score write — see `SCORE_INDEX_LOCK`.
  // Without it the delete can land between a writer's generation check and
  // its inserts, and those pre-rebuild rows survive the clear. In a
  // transaction because `pg_advisory_xact_lock` is released at commit, and a
  // bare statement would hold it for no span at all.
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${SCORE_INDEX_LOCK}, 0))`,
  );
  await tx.delete(commanderScores);
}

/**
 * Replaces `identity_composition` and retires every stored score, in the caller's transaction.
 *
 * TOGETHER, because the fit score reads this table's role figures (brief 2026-09-28 §5.4): a
 * commander with no measured row of its own is graded against its identity or colour-count
 * bucket, and `db:build:staples` rewrites those buckets AFTER the index build has already
 * cleared the scores. A /commanders or Home load in between persists scores against the old
 * buckets, and nothing else retires them. Doing the clear in the same transaction as the
 * rewrite means no reader sees the new buckets beside scores computed from the old ones.
 */
export async function replaceCompositionIn(
  tx: Pick<typeof db, "execute" | "delete" | "insert">,
  rows: (typeof identityComposition.$inferInsert)[],
): Promise<void> {
  await tx.delete(identityComposition);
  await tx.insert(identityComposition).values(rows);
  await clearPersistedScoresIn(tx);
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
  opts: BuildIndexOptions,
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
  const loadPairsFn = opts.loadPairs;
  const fetchPairFn = opts.fetchPair ?? fetchPairPage;
  const writePairFn = opts.writePair ?? writePair;
  const sleep = opts.sleep ?? defaultSleep;
  const delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
  const deriveRoles = opts.deriveRoleTargets ?? deriveAndWriteRoleTargets;

  // Exactly the rows this run replaced, accumulated as it replaces them. A refusal clears
  // these and nothing else — see the note at the commander write for why a timestamp range
  // cannot stand in for it.
  const writtenCommanders: string[] = [];
  const writtenPairs: [string, string][] = [];
  const [commanders, nameRows] = await Promise.all([load(), loadNames()]);
  const nameIndex = buildNameIndex(nameRows);
  // Spec §4/§10: state the candidate count before spending ~3,000 serial
  // fetches. The number is the run's own sanity check — a catalog regression
  // that halves it is visible in the first line of the log rather than in a
  // support table that quietly lost a thousand commanders.
  console.log(`commander-index: ${commanders.length} commander-legal candidates`);
  const already = opts.loadAlreadyComputed ? await opts.loadAlreadyComputed() : new Set<string>();

  const r: BuildIndexResult = {
    commanders: 0, roleTargets: 0, pairRoleTargets: 0, cardRows: 0, degraded: 0, absent: 0,
    unresolved: 0, skipped: 0, failed: 0,
    pairs: 0, pairCardRows: 0, pairsFailed: 0, pairsDegraded: 0, pairsUnresolved: 0,
    pairsSkipped: 0, legalPairs: null, pairRefusal: null,
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
      // THE RUN'S OWN OWNERSHIP RECORD. `computed_at >= runStartedAt` looks like one and is
      // not: it is a time RANGE, so a second build running concurrently has its rows fall
      // inside it, and a refusal here would clear that build's freshly derived roles while
      // leaving its support lists behind. These are the rows this run replaced, and nothing
      // else is.
      writtenCommanders.push(commander.oracleId);
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
  // WHAT THIS DOES NOT REACH, and what does. `/commanders`, `/discover` and the deck page's
  // synergy list wrap their payloads in `cacheForUser`, so a warm entry keeps the pre-rebuild
  // answer until something retires it; this delete only guarantees a cache MISS recomputes
  // correctly. What retires them is the catalog stamp the job's script makes on EVERY exit
  // (`scripts/build-commander-index.ts`): every `cacheForUser` key carries the catalog
  // generation. Before 2026-09-28 that stamp ran only when the run passed its checks, so a run
  // that failed its floors left warm entries standing for up to the hour ceiling.
  //
  // Not an index-generation token in these three keys: that generation
  // (`cache/index-generation.ts`) is built partly from `max(computed_at)` across the index
  // tables, which moves with every commander written, so a key on it would rebuild every warm
  // entry about once a minute for the whole run, each time against a half-written index. During
  // a run a warm reader of these three keeps the previous index's answer; a miss recomputes
  // against the index as it stands. The deck page's suggestions and the review page's mix DO key
  // on the index generation, so they accept that churn for their own reasons (see their pages). This workflow has no Next request context, which is why nothing
  // here calls `revalidateUserLists`.
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
  // THE SCORE CLEAR the long comment above belongs to — and it runs BEFORE the pair pass,
  // not after it. The guard reads the COMMANDER counters only, because `commander_scores` is
  // computed from commander support and a run that stored pairs and skipped every commander
  // has moved none of its inputs. Ordering it after the pairs made a throw anywhere in that
  // pass — `loadPairs` itself is outside the per-pair catch — skip the clear entirely, and
  // leave every stored score computed against an index that had already moved, marked
  // `writer_version`-current and indistinguishable from a fresh set. That is the exact
  // failure `probe:score-lock` exists for, reached from the one direction the lock cannot
  // help with. Clearing first fails the other way instead: a crash mid-pairs costs readers a
  // cold recompute, which is a cost rather than a wrong answer.
  if (r.commanders > 0 || r.skipped > 0) {
    await clearScores();
    console.log("commander-index: cleared persisted commander scores");
  }

  // ---- THE PAIR PASS -----------------------------------------------------------------
  //
  // Every LEGAL pair, plus every pair a deck holds (`loadPairs`). This used to be the built
  // pairs alone, for the cost: the legal set is 1,717 pairs, 1,653 of them generic `Partner` ×
  // `Partner`. But Change commander ranks only pairs with a stored row, and staging held one,
  // so "Change pair" offered nothing. Hugh approved the sweep on 2026-09-25 at the measured
  // price: about +1,750 requests (+57%), about 16 more minutes, about 463k support rows
  // (`docs/superpowers/plans/2026-09-25-pair-index.md`). EDHREC served 124 of 124 sampled pairs.
  //
  // Inside the same serial walk, with the same delay, under the same `max-parallel: 1` group,
  // so EDHREC still never sees a second request stream from us. A resumed run skips a pair
  // already recomputed, or every retry would pay the whole sweep again.
  // EVERYTHING FROM HERE IS BEHIND AN ERROR CLEANUP. The commander upserts above have already
  // committed, so a throw anywhere after them — `loadPairsFn`, a pair write, the role publish
  // itself — leaves rewritten support lists beside the PREVIOUS role averages, which is the
  // self-contradicting row the explicit refusal exists to prevent, arriving by a path the
  // refusal never sees. The clear is the same one both refusals use, and it runs before the
  // error is rethrown so the caller still fails.
  try {
    return await finishIndexRun();
  } catch (err) {
    try {
      const cleared = await clearRolesFor({ commanders: writtenCommanders, pairs: writtenPairs });
      console.error(
        `commander-index: run failed after writing — cleared the roles on ` +
        `${cleared.commanders} commander(s) and ${cleared.pairs} pair(s) it had replaced, ` +
        `so no row is left carrying averages for a card list it no longer has.`,
      );
    } catch (cleanupErr) {
      // Reported, never rethrown: the original failure is the one the operator needs.
      console.error("commander-index: the post-failure role clear ALSO failed", cleanupErr);
    }
    // The role figures just moved (to null), so the scores a load persisted against the
    // previous ones since the first clear go too. Both role refusals throw into this catch, so
    // this is the one place that covers them and every other failure after the writes. Its own
    // try, so a failed role clear cannot skip it. Only when the run wrote rows: one that moved
    // nothing has no roles to clear and no reason to cost every reader a cold recompute.
    // Or when the role pass published: a resume run that skipped every commander still writes
    // targets, and a throw after that (the clear itself) must not leave their scores standing.
    if (writtenCommanders.length > 0 || writtenPairs.length > 0 || r.roleTargets > 0 || r.pairRoleTargets > 0) {
      try {
        await clearScores();
        console.error("commander-index: cleared persisted commander scores after the failed run");
      } catch (clearErr) {
        console.error("commander-index: the post-failure score clear ALSO failed", clearErr);
      }
    }
    throw err;
  }

  async function finishIndexRun(): Promise<BuildIndexResult> {
  const loaded = await loadPairsFn();
  const pairs = Array.isArray(loaded) ? loaded : loaded.pairs;
  if (!Array.isArray(loaded)) {
    r.legalPairs = loaded.legal;
    r.pairRefusal = loaded.refusal;
    if (loaded.refusal) console.error(`commander-index: ${loaded.refusal}`);
  }
  const alreadyPairs = opts.loadAlreadyComputedPairs
    ? await opts.loadAlreadyComputedPairs()
    : new Set<string>();
  if (pairs.length > 0) {
    console.log(
      `commander-index: ${pairs.length} partner pair(s) to index` +
      (r.legalPairs === null ? "" : ` (${r.legalPairs} legal)`),
    );
  }
  for (const pair of pairs) {
    if (alreadyPairs.has(pairKey(pair))) { r.pairsSkipped++; continue; }
    await sleep(delayMs);
    try {
      const result = await fetchPairFn(pair.nameA, pair.nameB);
      const { header, cards: pairCards, unresolved } = toPairRows({
        pair: canonicalPair(pair.a, pair.b),
        result,
        nameIndex,
      });
      r.pairsUnresolved += unresolved;
      // Per PAGE, not only in the aggregate — the warning the commander loop emits, for its
      // own stated reason: one page contributing hundreds of unresolved names is a
      // name-format mismatch there, and a total cannot tell that from a broad drizzle.
      if (unresolved > 0) {
        console.warn(
          `commander-index: pair ${pair.nameA} + ${pair.nameB} — ${unresolved} unresolvable name(s)`,
        );
      }
      // Degraded is "we could not reach EDHREC", not a fact about the pair — the same rule
      // the single-commander write follows, and for the same reason: writing it would
      // cascade-delete a good pair's support list over one transient failure.
      // `r.pairsDegraded`, NOT `r.degraded`. That counter feeds two exit guards reading it as
      // "commanders degraded", so mixing pairs in means one unreachable pair fails a resume
      // run where every commander was skipped — exit 1, "EDHREC is unreachable", after a good run.
      if (header.synergyState === "degraded") { r.pairsDegraded++; continue; }
      await writePairFn(header, pairCards);
      writtenPairs.push([header.commanderOracleId, header.partnerOracleId]);
      r.pairs++;
      r.pairCardRows += pairCards.length;
    } catch (err) {
      r.pairsFailed++;
      console.error(`commander-index: pair ${pair.nameA} + ${pair.nameB} failed`, err);
    }
  }

  // ---- THE ROLE TARGETS --------------------------------------------------------------
  //
  // Last, because it reads every support row this run wrote. It REFUSES rather than
  // publishing a partial set, so a throw here leaves the previous figures standing and the
  // run reports a failure — which is the state an operator needs to see.
  const roles = await deriveRoles({ commanders: writtenCommanders, pairs: writtenPairs });
  r.roleTargets = roles.written;
  r.pairRoleTargets = roles.pairsWritten;

  // AND CLEAR AGAIN, because the fit score reads these figures (brief 2026-09-28 §5.4) and
  // the clear above ran before them. A /commanders or Home load between the two persists
  // scores against the PREVIOUS role targets, and nothing else retires those rows: the role
  // write leaves `computed_at` where it was, so the rows keep the current writer version and
  // the current index generation's timestamps. The clear takes `SCORE_INDEX_LOCK` exclusively,
  // so a write already past its guard lands before it and is deleted, and one after it re-reads
  // a generation whose role term has moved (`cache/index-generation.ts`) and is dropped.
  if (roles.written > 0 || roles.pairsWritten > 0) {
    await clearScores();
    console.log("commander-index: cleared persisted commander scores again, after the role targets");
  }
  console.log(
    `commander-index: role targets written for ${roles.written} commander(s) and ` +
    `${roles.pairsWritten} pair(s) · ${roles.zeroWipes} measure exactly 0 wipes`,
  );

  return r;
  }
}

/** Rows per UPDATE inside the publish transaction. Large enough that the round trips stop
 *  dominating, small enough that one statement's parameter list stays sane — six parameters a
 *  row puts a 500-row chunk at 3,000, well inside Postgres's 65,535 limit. */
const ROLE_WRITE_CHUNK = 500;

/** The rows a run actually replaced — its ownership record, and the only thing a refusal may
 *  clear. Ids rather than a time range: a range is not ownership. A second build running
 *  concurrently has its rows fall inside one, so a refusal keyed on time would clear that
 *  build's freshly derived roles and leave its support lists without targets. */
export type RunWrites = {
  commanders: readonly string[];
  pairs: readonly (readonly [string, string])[];
};

/**
 * Clear the role columns on exactly the rows this run rewrote, on both tables, in one
 * transaction.
 *
 * Shared by both refusals AND by the error path, because it is one rule rather than three.
 * These are the rows whose averages now describe a card list that is no longer beside them;
 * every other row still matches its own list and keeps its figures, which is why a refusal
 * does not blank the table. One transaction for both, since a reader takes the pair rung
 * before the commander rung and must not find one cleared and the other not.
 */
async function clearRolesFor(written: RunWrites) {
  if (written.commanders.length === 0 && written.pairs.length === 0) {
    return { commanders: 0, pairs: 0 };
  }
  const NO_ROLES = { avgRamp: null, avgDraw: null, avgRemoval: null, avgWipes: null };
  return db.transaction(async (tx) => {
    let c: { id: string }[] = [];
    if (written.commanders.length > 0) {
      c = await tx.update(commanderSupport).set(NO_ROLES)
        .where(inArray(commanderSupport.commanderOracleId, [...written.commanders]))
        .returning({ id: commanderSupport.commanderOracleId });
    }
    let p: { id: string }[] = [];
    if (written.pairs.length > 0) {
      const keys = written.pairs.map(([a, b]) => sql`(${a}::uuid, ${b}::uuid)`);
      p = await tx.update(commanderPairSupport).set(NO_ROLES)
        .where(sql`(${commanderPairSupport.commanderOracleId}, ${commanderPairSupport.partnerOracleId}) in (${sql.join(keys, sql`, `)})`)
        .returning({ id: commanderPairSupport.commanderOracleId });
    }
    return { commanders: c.length, pairs: p.length };
  });
}

/**
 * The four role targets, derived from the support lists this run just wrote.
 *
 * A FINAL PASS rather than per-commander work, because the derivation reads
 * `commander_support_cards` — which only exists in its final shape once the loop above has
 * finished — and writes `commander_support` columns, which this module owns.
 *
 * REFUSES rather than publishing a partial set. A derivation that reached only some commanders
 * would leave the rest on stale figures with no way for a reader to tell which is which, so a
 * run below the floor leaves every previous value standing and throws. Same discipline as
 * `db:build:staples`.
 *
 * WHAT "STANDING" MAY NOT MEAN: a row whose own card list this run already replaced. These four
 * columns are derived from `commander_support_cards`, and the loop above commits each
 * commander's list as it goes — so by the time a refusal happens, some rows carry averages
 * describing a list that no longer exists beside them. That is not stale data a reader can
 * discount; it is a row contradicting itself, and nothing on it says which half is current.
 *
 * So the refusal CLEARS the roles on exactly those rows and leaves every other commander's
 * alone. `written` is what draws the line — the ids the run replaced, recorded as it replaced
 * them. A commander the run never reached keeps averages that still match its own list, which
 * is the whole reason the refusal does not simply blank the table.
 */
export async function deriveAndWriteRoleTargets(
  written: RunWrites,
): Promise<RoleTargetPassResult> {
  const rows = await db
    .select({
      commanderOracleId: commanderSupportCards.commanderOracleId,
      oracleId: commanderSupportCards.oracleId,
      inclusion: commanderSupportCards.inclusion,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
      keywords: cards.keywords,
      layout: cards.layout,
    })
    .from(commanderSupportCards)
    .innerJoin(cards, eq(cards.oracleId, commanderSupportCards.oracleId))
    // RESTRICTED TO `ok` HEADERS, so the numerator counts the same population the floor's
    // denominator does. Without it the derivation reads the card rows of every header — and
    // the loop above leaves a `degraded` row AND its previous cards in place — so those stale
    // commanders inflate `targets.size` against an `ok`-only denominator, and a run that
    // reached well under 90% of the current `ok` commanders sails past the floor.
    //
    // The denominator stays `ok` rather than moving to "headers with cards", which would make
    // the two agree the other way round and look tidier. It would also make the floor
    // worthless against the failure it exists for: a join that loses half the card rows drops
    // the numerator and the denominator together, and the run reports full coverage.
    //
    // The cost is that a non-`ok` header keeps its type columns and loses its roles — the
    // §4A.6 disagreement in miniature. It is accepted because that header is unreachable by
    // construction here: `degraded` is never written (the loop `continue`s before the write),
    // and every row on staging and local-dev is `ok`.
    .innerJoin(
      commanderSupport,
      eq(commanderSupport.commanderOracleId, commanderSupportCards.commanderOracleId),
    )
    .where(sql`${commanderSupport.synergyState} = 'ok'`);

  const targets = deriveRoleTargets(
    rows.map((r) => ({
      commanderOracleId: r.commanderOracleId,
      oracleId: r.oracleId,
      inclusion: r.inclusion,
      typeLine: r.typeLine ?? "",
      oracleText: r.oracleText,
      keywords: r.keywords ?? [],
      layout: r.layout ?? "normal",
    })),
  );

  const [{ ok }] = await db
    .select({ ok: sql<number>`count(*)::int` })
    .from(commanderSupport)
    .where(sql`${commanderSupport.synergyState} = 'ok'`);

  if (!roleTargetsPublishable(targets.size, ok)) {
    const cleared = await clearRolesFor(written);
    throw new Error(
      `role targets REFUSED: derived ${targets.size} of ${ok} ok commanders ` +
      `(floor ${Math.ceil(ok * ROLE_TARGET_FLOOR)}). Cleared the roles on ` +
      `${cleared.commanders} commander(s) and ${cleared.pairs} pair(s) this run rewrote — ` +
      `their averages described a card list that no longer exists. Every other row is ` +
      `untouched and still matches its own list.`,
    );
  }

  const entries = [...targets];

  // THE PAIR RUNG TOO. Its own table, its own cards, and read BEFORE the commander rung by the
  // basis chain — so a pair left without role targets is a partner deck getting measured types
  // with no roles beside them, which is the one shape these columns exist to prevent.
  const pairRows = await db
    .select({
      commanderOracleId: commanderPairSupportCards.commanderOracleId,
      partnerOracleId: commanderPairSupportCards.partnerOracleId,
      oracleId: commanderPairSupportCards.oracleId,
      inclusion: commanderPairSupportCards.inclusion,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
      keywords: cards.keywords,
      layout: cards.layout,
    })
    .from(commanderPairSupportCards)
    .innerJoin(cards, eq(cards.oracleId, commanderPairSupportCards.oracleId))
    // The same restriction, for the same reason — the pair floor below counts `ok` pairs.
    .innerJoin(
      commanderPairSupport,
      and(
        eq(commanderPairSupport.commanderOracleId, commanderPairSupportCards.commanderOracleId),
        eq(commanderPairSupport.partnerOracleId, commanderPairSupportCards.partnerOracleId),
      ),
    )
    .where(sql`${commanderPairSupport.synergyState} = 'ok'`);

  // Keyed on the pair, not the primary: `deriveRoleTargets` groups by whatever id it is given,
  // and two pairs sharing a primary commander would otherwise fold into one set of figures.
  const pairTargets = deriveRoleTargets(
    pairRows.map((r) => ({
      commanderOracleId: `${r.commanderOracleId}|${r.partnerOracleId}`,
      oracleId: r.oracleId,
      inclusion: r.inclusion,
      typeLine: r.typeLine ?? "",
      oracleText: r.oracleText,
      keywords: r.keywords ?? [],
      layout: r.layout ?? "normal",
    })),
  );

  // THE PAIR POPULATION GETS THE SAME REFUSAL, and needs its own because the commander check
  // above cannot see it: the transaction below clears every pair role column and then fills
  // only the pairs this derivation reached, so a join that lost half the pair support cards
  // would publish exactly the partial set this pass claims to refuse — silently, since
  // `pairsWritten` would report whatever it did write as a success.
  //
  // The zero-row case is a LEGITIMATE state rather than a failure, and is why this is not
  // simply the same call: a database with no indexed pairs at all has nothing to derive and
  // nothing to lose, and refusing there would fail every run until the first pair is indexed
  // — the same reasoning `db:build:staples` applies to an empty composition.
  const [{ okPairs }] = await db
    .select({ okPairs: sql<number>`count(*)::int` })
    .from(commanderPairSupport)
    .where(sql`${commanderPairSupport.synergyState} = 'ok'`);
  if (okPairs > 0 && !roleTargetsPublishable(pairTargets.size, okPairs)) {
    const cleared = await clearRolesFor(written);
    throw new Error(
      `role targets REFUSED: derived ${pairTargets.size} of ${okPairs} ok PAIRS ` +
      `(floor ${Math.ceil(okPairs * ROLE_TARGET_FLOOR)}). Cleared the roles on ` +
      `${cleared.commanders} commander(s) and ${cleared.pairs} pair(s) this run rewrote. ` +
      `The commander half had already passed its own floor, so publishing would have left ` +
      `the pair rung partial while every commander read whole.`,
    );
  }

  // ONE TRANSACTION FOR THE WHOLE PUBLISH, clear then fill — the shape `job=printings` was
  // corrected to in #704, and for the same reason.
  //
  // Two failures this closes. A per-slice loop commits as it goes, so a transient failure on a
  // later slice leaves earlier commanders on new figures and the rest on the previous run's:
  // the partial state the refusal above exists to prevent, published anyway. And the CLEAR
  // belongs here rather than in the per-commander upsert, so a commander whose page went
  // `absent` — its support cards deleted, so this derivation never reaches it — loses its stale
  // roles at the same instant everyone else gains theirs, rather than hundreds of transactions
  // earlier and irrespective of whether this pass ever succeeds.
  await db.transaction(async (tx) => {
    const NO_ROLES = { avgRamp: null, avgDraw: null, avgRemoval: null, avgWipes: null };
    await tx.update(commanderSupport).set(NO_ROLES);
    await tx.update(commanderPairSupport).set(NO_ROLES);

    // BATCHED, one statement per ROLE_WRITE_CHUNK rows rather than one per commander. The
    // single transaction above is required — a per-slice commit publishes the partial state
    // this pass refuses — but 3,279 round trips is what made holding it expensive, and the
    // transaction's duration is the whole cost a reader elsewhere pays for it.
    for (let i = 0; i < entries.length; i += ROLE_WRITE_CHUNK) {
      const slice = entries.slice(i, i + ROLE_WRITE_CHUNK);
      const tuples = slice.map(([id, t]) =>
        sql`(${id}::uuid, ${t.ramp}::real, ${t.draw}::real, ${t.removal}::real, ${t.wipes}::real)`);
      await tx.execute(sql`
        update ${commanderSupport} as cs
           set avg_ramp = v.ramp, avg_draw = v.draw,
               avg_removal = v.removal, avg_wipes = v.wipes
          from (values ${sql.join(tuples, sql`, `)}) as v(id, ramp, draw, removal, wipes)
         where cs.commander_oracle_id = v.id`);
    }

    const pairEntries = [...pairTargets];
    for (let i = 0; i < pairEntries.length; i += ROLE_WRITE_CHUNK) {
      const tuples = pairEntries.slice(i, i + ROLE_WRITE_CHUNK).map(([key, t]) => {
        const [a, b] = key.split("|");
        return sql`(${a}::uuid, ${b}::uuid, ${t.ramp}::real, ${t.draw}::real,
                    ${t.removal}::real, ${t.wipes}::real)`;
      });
      await tx.execute(sql`
        update ${commanderPairSupport} as ps
           set avg_ramp = v.ramp, avg_draw = v.draw,
               avg_removal = v.removal, avg_wipes = v.wipes
          from (values ${sql.join(tuples, sql`, `)})
            as v(id, partner, ramp, draw, removal, wipes)
         where ps.commander_oracle_id = v.id and ps.partner_oracle_id = v.partner`);
    }
  });

  return {
    written: targets.size,
    pairsWritten: pairTargets.size,
    zeroWipes: entries.filter(([, t]) => t.wipes === 0).length,
  };
}

/**
 * Why a finished run's pair pass should fail the job, or null when it should not.
 *
 * Its own counters and its own floors, so a commander run is never failed by a pair and the
 * reverse. Three ways, each a broken sweep wearing a green tick:
 * - the legal sweep was refused (the enumeration came back under `LEGAL_PAIR_FLOOR`);
 * - every attempted pair degraded or failed, so no pair page was stored;
 * - more than 5% of ATTEMPTED pairs degraded or failed. Skipped pairs are not attempted, so a
 *   resumed run cannot trip it on a handful. Compared as an integer ratio for the reason the
 *   commander guard gives: a rounded allowance rounds up, nearly doubling the bar at 21.
 */
export function pairRunProblem(r: BuildIndexResult): string | null {
  if (r.pairRefusal) return r.pairRefusal;
  const attempted = r.pairs + r.pairsDegraded + r.pairsFailed;
  if (attempted === 0) return null;
  const bad = r.pairsDegraded + r.pairsFailed;
  if (r.pairs === 0) {
    return `all ${attempted} pair(s) degraded or failed — no pair page was stored. ` +
      `The commander index above is unaffected and stands.`;
  }
  if (bad * 20 > attempted) {
    return `${bad} of ${attempted} attempted pairs degraded or failed (threshold: 5% of ` +
      `attempted). The pair index is materially incomplete.`;
  }
  return null;
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
