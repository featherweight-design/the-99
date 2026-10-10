import type { Job } from "../labels/types";
import { jobRowsOf, type JobRowsByCard } from "./job-tally";
import { loadStatsLabels } from "./stats-labels";

/** The Jobs card's labels for a deck's cards, as row keys. Null when the read failed: the card then stays a
 *  shell, because calling every card unlabeled would state something the read never learned.
 *  `labels` is a read the caller already made for these cards (the Stats cards share one); left out, this reads. */
export async function loadJobRows(
  cards: readonly { oracleId: string; typeLine: string }[],
  labels?: ReadonlyMap<string, Job[]> | null,
): Promise<JobRowsByCard | null> {
  const read = labels === undefined ? await loadStatsLabels(cards) : labels;
  if (!read) return null;
  return Object.fromEntries([...read].map(([id, jobs]) => [id, jobRowsOf(jobs)]));
}
