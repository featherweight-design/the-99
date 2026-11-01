import { SCORE_WRITER_CURRENT } from "../../db/schema";

/**
 * The `commander_scores.writer_version` THIS deployment writes and accepts (labels-everywhere PR 5).
 *
 * The table records no role basis, so the basis rides in the version: the classifier's rows carry
 * `SCORE_WRITER_CURRENT`, and rows counted by LABEL carry its negation. A reader accepts only the
 * version it would write (`!==`, not `<`), so a classifier row left from before the switch was
 * retired is stale (a miss, recomputed) rather than served as current. A negative number is also
 * what keeps rollback safe: a deployment that predates the switch reads `-8 < 8` as stale and never
 * serves a label row.
 */
export function scoreWriterVersion(_env: NodeJS.ProcessEnv): number {
  // LABEL_ROLE_COUNTS retired (Hugh 2026-10-31): every row is counted by label, so this always writes
  // and accepts the negated version. `_env` stays so the score store's callers need not move.
  return -SCORE_WRITER_CURRENT;
}
