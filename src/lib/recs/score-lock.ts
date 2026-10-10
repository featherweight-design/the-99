import { sql } from "drizzle-orm";
import { commanderScores } from "../../db/schema";

/**
 * The advisory lock every `commander_scores` writer takes SHARED and every clear takes EXCLUSIVE, so
 * a delete can never land between a writer's generation check and its inserts. In its own module,
 * free of `src/db`, because the label publish (`labels/publish.ts`, which takes its connection as
 * an argument so a probe can call it) retires scores too.
 */
export const SCORE_INDEX_LOCK = "commander-scores:commander-index";

/** Anything that can run a statement and a delete: the app's `db`, or a transaction on one. */
type ScoreTx = {
  execute: (query: ReturnType<typeof sql>) => PromiseLike<unknown>;
  delete: (table: typeof commanderScores) => PromiseLike<unknown>;
};

/**
 * Retires every persisted score, in a transaction the caller owns. Exclusive on `SCORE_INDEX_LOCK`
 * (see above), and in a transaction because `pg_advisory_xact_lock` is released at commit, so a bare
 * statement would hold it for no span at all.
 */
export async function retirePersistedScoresIn(tx: ScoreTx): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${SCORE_INDEX_LOCK}, 0))`);
  await tx.delete(commanderScores);
}
