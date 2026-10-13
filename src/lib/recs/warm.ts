import { recommendCommanders } from "./recommend";
import { collectionGeneration, indexGeneration, persistScores } from "./store";

/**
 * Recomputes and stores `userId`'s commander scores, for a collection write to run in `after()`.
 * Every collection write clears the scores, and the next `/commanders` read would otherwise pay
 * the recompute (~2.2s warm on staging) inside the navigation.
 *
 * An optimisation, never a correctness requirement: if it is cut short by the route's max
 * duration, or fails, the read path recomputes on the first visit. Errors are swallowed for that
 * reason.
 *
 * BOTH fingerprints are taken before the compute, which is the whole point of them: taken after,
 * each would describe the state the compute finished in rather than the state it read, and would
 * match itself no matter what moved underneath. So a warm overtaken by a later write is dropped
 * rather than stored.
 *
 * `env` is the writer's resolved switches, taken BEFORE `after()`: the role basis, and the writer
 * version it stamps, follow its `LABEL_ROLE_COUNTS_ENABLED` (admin PR 6d-2).
 */
export async function warmCommanderScores(userId: string, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  try {
    const [generation, indexGen] = await Promise.all([collectionGeneration(userId), indexGeneration()]);
    const recs = await recommendCommanders(userId, env);
    if (!recs.labelFallback) await persistScores(userId, recs.results, generation, indexGen, recs.labelCheck, env);
  } catch {
    // Swallow: the lazy path in getRankedList is the correctness backstop.
  }
}
