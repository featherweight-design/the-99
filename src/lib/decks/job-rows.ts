import "server-only";

import { isLandFace } from "../cards/facet";
import { readLabels } from "../labels/read";
import { jobRowsOf, type JobRowsByCard } from "./job-tally";

/** The Jobs card's labels for a deck's cards, as row keys. Null when the read failed: the card then
 *  stays a shell, because calling every card unlabeled would state something the read never learned. */
export async function loadJobRows(cards: readonly { oracleId: string; typeLine: string }[]): Promise<JobRowsByCard | null> {
  try {
    const labels = await readLabels(cards.filter((c) => !isLandFace(c.typeLine)).map((c) => c.oracleId));
    return Object.fromEntries([...labels].map(([id, jobs]) => [id, jobRowsOf(jobs)]));
  } catch {
    return null;
  }
}
