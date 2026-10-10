import { SCORE_WRITER_CURRENT } from "../../db/schema";
import { labelRoleCountsEnabled } from "../decks/label-counts-flag";

/**
 * The `commander_scores.writer_version` THIS deployment writes and accepts (labels-everywhere PR 5).
 *
 * The table records no role basis, so the basis rides in the version: the classifier's rows carry
 * `SCORE_WRITER_CURRENT`, and rows counted by LABEL carry its negation. A reader accepts only the
 * version it would write (`!==`, not `<`), so flipping `LABEL_ROLE_COUNTS_ENABLED` either way makes
 * the other basis's rows stale (a miss, recomputed) rather than served as current. A negative
 * number is also what keeps rollback safe: a deployment that predates the switch reads
 * `-8 < 8` as stale and never serves a label row.
 */
export function scoreWriterVersion(env: NodeJS.ProcessEnv = process.env): number {
  return labelRoleCountsEnabled(env) ? -SCORE_WRITER_CURRENT : SCORE_WRITER_CURRENT;
}
